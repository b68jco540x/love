import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Bot } from "grammy";
import { getAddons } from "../core/index.js";
import "./rec.js";

function createMockBot() {
  const commands: Record<string, (ctx: any) => Promise<void>> = {};
  const mockBot = {
    command: (cmd: string, handler: (ctx: any) => Promise<void>) => {
      commands[cmd] = handler;
    },
  } as unknown as Bot;

  return { mockBot, commands };
}

function createMockContext(match = "") {
  const replies: { text: string; opts?: any }[] = [];
  const photoReplies: { photo: string; opts?: any }[] = [];

  const ctx = {
    match,
    message: { message_id: 123 },
    reply: vi.fn(async (text: string, opts?: any) => {
      replies.push({ text, opts });
    }),
    replyWithPhoto: vi.fn(async (photo: string, opts?: any) => {
      photoReplies.push({ photo, opts });
    }),
  };

  return { ctx, replies, photoReplies };
}

describe("rec addon (/rec command)", () => {
  let commands: Record<string, (ctx: any) => Promise<void>>;

  beforeEach(() => {
    vi.restoreAllMocks();
    const { mockBot, commands: cmds } = createMockBot();
    const addons = getAddons();
    const recAddon = addons.find((a: any) => a.name === "rec");
    expect(recAddon).toBeDefined();
    recAddon!.register(mockBot, {} as any);
    commands = cmds;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers /rec command", () => {
    expect(commands["rec"]).toBeTypeOf("function");
  });

  it("shows usage if type or title is missing or invalid", async () => {
    const { ctx: ctx1 } = createMockContext("");
    await commands["rec"](ctx1);
    expect(ctx1.reply).toHaveBeenCalledWith("Usage: /rec anime <title> or /rec manga <title>");

    const { ctx: ctx2 } = createMockContext("invalidtype Naruto");
    await commands["rec"](ctx2);
    expect(ctx2.reply).toHaveBeenCalledWith("Usage: /rec anime <title> or /rec manga <title>");
  });

  it("handles title not found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }));

    const { ctx } = createMockContext("anime nonexistent12345");
    await commands["rec"](ctx);
    expect(ctx.reply).toHaveBeenCalledWith('Not found: "nonexistent12345"');
  });

  it("handles item with no recommendations", async () => {
    const mockSearchResp = {
      data: [{ malId: 100, title: "Obscure Title", imageUrl: "https://example.com/pic.jpg" }],
    };
    const mockRecResp = { data: [] };

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockSearchResp })
      .mockResolvedValueOnce({ ok: true, json: async () => mockRecResp });

    vi.stubGlobal("fetch", fetchMock);

    const { ctx } = createMockContext("anime Obscure Title");
    await commands["rec"](ctx);
    expect(ctx.reply).toHaveBeenCalledWith('No recommendations for "Obscure Title".');
  });

  it("fetches and formats recommendations successfully (mocked API)", async () => {
    const mockSearchResp = {
      data: [{ malId: 20, title: "Naruto", imageUrl: "https://example.com/naruto.jpg" }],
    };
    const mockRecResp = {
      data: [
        { malId: 1, title: "Bleach" },
        { malId: 2, title: "One Piece" },
      ],
    };

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockSearchResp })
      .mockResolvedValueOnce({ ok: true, json: async () => mockRecResp });

    vi.stubGlobal("fetch", fetchMock);

    const { ctx, photoReplies } = createMockContext("anime Naruto");
    await commands["rec"](ctx);

    expect(ctx.replyWithPhoto).toHaveBeenCalled();
    expect(photoReplies.length).toBe(1);
    expect(photoReplies[0].photo).toBe("https://example.com/naruto.jpg");
    expect(photoReplies[0].opts.caption).toContain("*Recommendations based on Naruto:*");
    expect(photoReplies[0].opts.caption).toContain("1. Bleach");
    expect(photoReplies[0].opts.caption).toContain("2. One Piece");
  });

  it("works with live Jikan API for anime recommendations", async () => {
    const { ctx, photoReplies, replies } = createMockContext("anime Naruto");
    await commands["rec"](ctx);

    const totalReplies = photoReplies.length + replies.length;
    expect(totalReplies).toBeGreaterThan(0);
    if (photoReplies.length > 0) {
      expect(photoReplies[0].opts.caption).toContain("Recommendations based on Naruto");
    } else {
      expect(replies[0].text).toContain("Recommendations based on Naruto");
    }
  });

  it("works with live Jikan API for manga recommendations", async () => {
    const { ctx, photoReplies, replies } = createMockContext("manga Naruto");
    await commands["rec"](ctx);

    const totalReplies = photoReplies.length + replies.length;
    expect(totalReplies).toBeGreaterThan(0);
    if (photoReplies.length > 0) {
      expect(photoReplies[0].opts.caption).toContain("Recommendations based on Naruto");
    } else {
      expect(replies[0].text).toContain("Recommendations based on Naruto");
    }
  });
});
