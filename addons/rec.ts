import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerAddon } from "../core/index.ts";
import { safeReply } from "../core/helpers.ts";

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
      const sd = await fetch(`https://api.jikan.moe/v4/${type}?q=${encodeURIComponent(title)}&limit=1`).then(r => r.json());
      if (!sd.data?.length) { await ctx.reply(`Not found: "${title}"`); return; }
      const item = sd.data[0];
      const rd = await fetch(`https://api.jikan.moe/v4/${type}/${item.mal_id}/recommendations`).then(r => r.json());
      if (!rd.data?.length) { await ctx.reply(`No recommendations for "${item.title}".`); return; }
      const lines = [
        `*Recommendations based on ${item.title}:*`, ``,
        ...rd.data.slice(0, 5).map((r: { entry: { title: string } }, i: number) => `${i + 1}. ${r.entry.title}`),
      ].join("\n");
      const cover = item.images?.jpg?.large_image_url;
      if (cover) await ctx.replyWithPhoto(cover, { caption: lines, parse_mode: "Markdown", reply_parameters: { message_id: ctx.message!.message_id } });
      else await safeReply(ctx, lines, { reply_parameters: { message_id: ctx.message!.message_id } });
    });
  },
});
