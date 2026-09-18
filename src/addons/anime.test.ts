import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Bot } from "grammy";
import { getAddons } from "../core/index.js";
import "./anime.js";

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

describe("anime addon (/mal command)", () => {
  let commands: Record<string, (ctx: any) => Promise<void>>;

  beforeEach(() => {
    vi.restoreAllMocks();
    const { mockBot, commands: cmds } = createMockBot();
    const addons = getAddons();
    const animeAddon = addons.find((a: any) => a.name === "anime");
    expect(animeAddon).toBeDefined();
    animeAddon!.register(mockBot, {} as any);
    commands = cmds;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers /mal command", () => {
    expect(commands["mal"]).toBeTypeOf("function");
  });

  it("shows usage if query is empty", async () => {
    const { ctx } = createMockContext("");
    await commands["mal"](ctx);
    expect(ctx.reply).toHaveBeenCalledWith("Usage: /mal <title>");
  });

  it("handles search not found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }));

    const { ctx } = createMockContext("nonexistentanime12345");
    await commands["mal"](ctx);
    expect(ctx.reply).toHaveBeenCalledWith('Not found: "nonexistentanime12345"');
  });

  it("fetches and formats anime info successfully (mocked API)", async () => {
    const mockSearchResp = {
      data: [{ malId: 20, title: "Naruto" }],
    };
    const mockDetailResp = {
      data: {
        malId: 20,
        title: "Naruto",
        titleJapanese: "ナルト",
        score: 7.9,
        episodes: 220,
        status: "Finished Airing",
        type: "TV",
        aired: { string: "Oct 3, 2002 to Feb 8, 2007" },
        genres: [{ name: "Action" }, { name: "Adventure" }],
        studios: [{ name: "Studio Pierrot" }],
        imageUrl: "https://cdn.myanimelist.net/images/anime/13/73862.jpg",
      },
    };

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockSearchResp })
      .mockResolvedValueOnce({ ok: true, json: async () => mockDetailResp });

    vi.stubGlobal("fetch", fetchMock);

    const { ctx, photoReplies } = createMockContext("Naruto");
    await commands["mal"](ctx);

    expect(ctx.replyWithPhoto).toHaveBeenCalled();
    expect(photoReplies.length).toBe(1);
    expect(photoReplies[0].photo).toBe("https://cdn.myanimelist.net/images/anime/13/73862.jpg");
    expect(photoReplies[0].opts.caption).toContain("*Naruto*");
    expect(photoReplies[0].opts.caption).toContain("(ナルト)");
    expect(photoReplies[0].opts.caption).toContain("Score: 7.9/10");
  });

  it("works with live Jikan API", async () => {
    const { ctx, photoReplies, replies } = createMockContext("Naruto");
    await commands["mal"](ctx);

    const totalReplies = photoReplies.length + replies.length;
    expect(totalReplies).toBeGreaterThan(0);
    if (photoReplies.length > 0) {
      expect(photoReplies[0].opts.caption).toContain("Naruto");
    } else {
      expect(replies[0].text).toContain("Naruto");
    }
  });
});
