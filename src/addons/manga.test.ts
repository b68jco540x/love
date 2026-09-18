import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Bot } from "grammy";
import { getAddons } from "../core/index.js";
import "./manga.js";

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

describe("manga addon (/manga command)", () => {
  let commands: Record<string, (ctx: any) => Promise<void>>;

  beforeEach(() => {
    vi.restoreAllMocks();
    const { mockBot, commands: cmds } = createMockBot();
    const addons = getAddons();
    const mangaAddon = addons.find((a: any) => a.name === "manga");
    expect(mangaAddon).toBeDefined();
    mangaAddon!.register(mockBot, {} as any);
    commands = cmds;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers /manga command", () => {
    expect(commands["manga"]).toBeTypeOf("function");
  });

  it("shows usage if query is empty", async () => {
    const { ctx } = createMockContext("");
    await commands["manga"](ctx);
    expect(ctx.reply).toHaveBeenCalledWith("Usage: /manga <title>");
  });

  it("handles search not found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }));

    const { ctx } = createMockContext("nonexistentmanga12345");
    await commands["manga"](ctx);
    expect(ctx.reply).toHaveBeenCalledWith('Not found: "nonexistentmanga12345"');
  });

  it("fetches and formats manga info successfully (mocked API)", async () => {
    const mockSearchResp = {
      data: [{ malId: 11, title: "Naruto" }],
    };
    const mockDetailResp = {
      data: {
        malId: 11,
        title: "Naruto",
        titleJapanese: "NARUTO -ナルト-",
        score: 8.1,
        chapters: 700,
        volumes: 72,
        status: "Finished",
        type: "Manga",
        published: { string: "Sep 21, 1999 to Nov 10, 2014" },
        genres: [{ name: "Action" }, { name: "Adventure" }],
        authors: [{ name: "Kishimoto, Masashi" }],
        imageUrl: "https://cdn.myanimelist.net/images/manga/3/117833.jpg",
      },
    };

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockSearchResp })
      .mockResolvedValueOnce({ ok: true, json: async () => mockDetailResp });

    vi.stubGlobal("fetch", fetchMock);

    const { ctx, photoReplies } = createMockContext("Naruto");
    await commands["manga"](ctx);

    expect(ctx.replyWithPhoto).toHaveBeenCalled();
    expect(photoReplies.length).toBe(1);
    expect(photoReplies[0].photo).toBe("https://cdn.myanimelist.net/images/manga/3/117833.jpg");
    expect(photoReplies[0].opts.caption).toContain("*Naruto*");
    expect(photoReplies[0].opts.caption).toContain("(NARUTO -ナルト-)");
    expect(photoReplies[0].opts.caption).toContain("Score: 8.1/10");
    expect(photoReplies[0].opts.caption).toContain("Chapters: 700");
  });

  it("works with live Jikan API", async () => {
    const { ctx, photoReplies, replies } = createMockContext("Naruto");
    await commands["manga"](ctx);

    const totalReplies = photoReplies.length + replies.length;
    expect(totalReplies).toBeGreaterThan(0);
    if (photoReplies.length > 0) {
      expect(photoReplies[0].opts.caption).toContain("Naruto");
    } else {
      expect(replies[0].text).toContain("Naruto");
    }
  });
});
