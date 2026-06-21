import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { safeReply, safeFetchJson } from "../core/helpers.js";

interface JikanMangaResp { data?: Record<string, any>[] }

registerAddon({
  name: "manga",
  commands: [{ cmd: "manga", desc: "manga info <title>" }],

  register(bot: Bot, _env: Env) {
    bot.command("manga", async (ctx) => {
      const query = ctx.match?.trim() ?? "";
      if (!query) { await ctx.reply("Usage: /manga <title>"); return; }
      const d = await safeFetchJson<JikanMangaResp>(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=1`);
      if (!d) { await ctx.reply("Failed to fetch data, try again later."); return; }
      if (!d.data?.length) { await ctx.reply(`Not found: "${query}"`); return; }
      const m = d.data[0];
      const lines = [
        `*${m.title}*`,
        m.title_japanese ? `(${m.title_japanese})` : "",
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
      if (m.images?.jpg?.large_image_url) await ctx.replyWithPhoto(m.images.jpg.large_image_url, { caption: lines, parse_mode: "Markdown", reply_parameters: { message_id: ctx.message!.message_id } });
      else await safeReply(ctx, lines, { reply_parameters: { message_id: ctx.message!.message_id } });
    });
  },
});
