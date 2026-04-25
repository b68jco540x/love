import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import { InlineKeyboard } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerAddon } from "../core/index.ts";
import { editPhoto } from "../core/helpers.ts";

const fetchNekos = async (tag: string | null) => {
  let url = "https://api.nekosapi.com/v4/images/random?limit=1&rating=safe";
  if (tag) url += `&tags=${encodeURIComponent(tag)}`;
  const json = await fetch(url).then(r => r.json());
  return Array.isArray(json) ? json[0] : null;
};

registerAddon({
  name: "nekos",
  commands: [{ cmd: "nekos", desc: "random image from NekosAPI [tag]" }],

  register(bot: Bot, env: Env) {
    bot.command("nekos", async (ctx) => {
      const tag = ctx.match?.trim() || null;
      const img = await fetchNekos(tag);
      if (!img) { await ctx.reply("No results found."); return; }
      const caption = img.tags?.length ? `• Tags: ${img.tags.join(", ")}` : undefined;
      const kb = new InlineKeyboard().text("🔄 Refresh", `nekos_refresh:${tag ?? ""}`);
      await ctx.replyWithPhoto(img.url, { caption, parse_mode: "Markdown", reply_markup: kb, reply_parameters: { message_id: ctx.message!.message_id } });
    });

    bot.callbackQuery(/^nekos_refresh:(.*)$/, async (ctx) => {
      const tag = ctx.match[1] || null;
      const img = await fetchNekos(tag);
      if (!img) { await ctx.answerCallbackQuery("No results found."); return; }
      const caption = img.tags?.length ? `• Tags: ${img.tags.join(", ")}` : null;
      const kb = new InlineKeyboard().text("🔄 Refresh", ctx.callbackQuery.data);
      await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, img.url, caption, kb);
      await ctx.answerCallbackQuery();
    });
  },
});
