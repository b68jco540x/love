import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { editPhoto, safeFetchJson, replyTo } from "../core/helpers.js";

interface NekosImage {
  url: string;
  tags?: string[];
}

const fetchNekos = async (tag: string | null): Promise<NekosImage | null> => {
  let url = "https://api.nekosapi.com/v4/images/random?limit=1&rating=safe";
  if (tag) url += `&tags=${encodeURIComponent(tag)}`;
  const json = await safeFetchJson<NekosImage[]>(url);
  return Array.isArray(json) ? json[0] ?? null : null;
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
      await ctx.replyWithPhoto(img.url, { caption, parse_mode: "Markdown", reply_markup: kb, reply_parameters: replyTo(ctx) });
    });

    bot.callbackQuery(/^nekos_refresh:(.*)$/, async (ctx) => {
      const tag = ctx.match[1] || null;
      const img = await fetchNekos(tag);
      if (!img) { await ctx.answerCallbackQuery("No results found."); return; }
      const caption = img.tags?.length ? `• Tags: ${img.tags.join(", ")}` : null;
      const kb = new InlineKeyboard().text("🔄 Refresh", ctx.callbackQuery.data);
      const ok = await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, img.url, caption, kb);
      await ctx.answerCallbackQuery(ok ? undefined : { text: "Edit failed." });
    });
  },
});
