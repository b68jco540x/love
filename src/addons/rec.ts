import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { replyWithPhotoOrText, fetchJikanJson } from "../core/helpers.js";

interface JikanSearchResp { data?: Record<string, any>[] }
interface JikanRecResp { data?: { malId: number; title: string; imageUrl?: string; votes?: number }[] }

registerAddon({
  name: "rec",
  commands: [{ cmd: "rec", desc: "recommendations <anime|manga> <title>" }],

  register(bot: Bot, _env: Env) {
    bot.command("rec", async (ctx) => {
      const parts = (ctx.match?.trim() ?? "").split(/\s+/);
      const type = parts[0]?.toLowerCase();
      const title = parts.slice(1).join(" ");
      if (!type || !title || (type !== "anime" && type !== "manga")) {
        await ctx.reply("Usage: /rec anime <title> or /rec manga <title>");
        return;
      }
      // jikan-edge: no `limit` param on search.
      const sd = await fetchJikanJson<JikanSearchResp>(`/${type}?q=${encodeURIComponent(title)}`);
      if (!sd) { await ctx.reply("Failed to fetch data, try again later."); return; }
      if (!sd.data?.length) { await ctx.reply(`Not found: "${title}"`); return; }
      const item = sd.data[0];
      const rd = await fetchJikanJson<JikanRecResp>(`/${type}/${item.malId}/recommendations`);
      if (!rd) { await ctx.reply("Failed to fetch recommendations, try again later."); return; }
      if (!rd.data?.length) { await ctx.reply(`No recommendations for "${item.title}".`); return; }
      const lines = [
        `*Recommendations based on ${item.title}:*`, ``,
        ...rd.data.slice(0, 5).map((r, i) => `${i + 1}. ${r.title}`),
      ].join("\n");
      const cover = item.imageUrl;
      await replyWithPhotoOrText(ctx, cover, lines);
    });
  },
});
