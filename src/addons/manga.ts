import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { replyWithPhotoOrText, fetchJikanJson, JIKAN_BASE_URL } from "../core/helpers.js";

interface JikanMangaResp { data?: Record<string, any>[] }
interface JikanEdgeDetail { data?: Record<string, any> }

registerAddon({
  name: "manga",
  commands: [{ cmd: "manga", desc: "manga info <title>" }],

  register(bot: Bot, _env: Env) {
    bot.command("manga", async (ctx) => {
      const query = ctx.match?.trim() ?? "";
      if (!query) { await ctx.reply("Usage: /manga <title>"); return; }
      const search = await fetchJikanJson<JikanMangaResp>(`${JIKAN_BASE_URL}/manga?q=${encodeURIComponent(query)}`);
      if (!search) { await ctx.reply("Failed to fetch data, try again later."); return; }
      if (!search.data?.length) { await ctx.reply(`Not found: "${query}"`); return; }
      const detail = await fetchJikanJson<JikanEdgeDetail>(`${JIKAN_BASE_URL}/manga/${search.data[0].malId}`);
      if (!detail?.data) { await ctx.reply("Failed to fetch data, try again later."); return; }
      const m = detail.data;
      const lines = [
        `*${m.title}*`,
        m.titleJapanese ? `(${m.titleJapanese})` : "",
        ``,
        `• Score: ${m.score ? m.score + "/10" : "N/A"}`,
        `• Chapters: ${m.chapters ?? "?"}`,
        `• Volumes: ${m.volumes ?? "?"}`,
        `• Status: ${m.status ?? "N/A"}`,
        `• Type: ${m.type ?? "N/A"}`,
        `• Published: ${m.published?.string ?? "N/A"}`,
        `• Genres: ${m.genres?.map((g: { name: string }) => g.name).join(", ") ?? "N/A"}`,
        `• Authors: ${m.authors?.map((a: { name: string }) => a.name).join(", ") ?? "N/A"}`,
      ].filter(Boolean).join("\n");
      await replyWithPhotoOrText(ctx, m.images?.large ?? m.imageUrl, lines);
    });
  },
});
