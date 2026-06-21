import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { refreshKb, editPhoto, safeFetchJson } from "../core/helpers.js";

registerAddon({
  name: "neko",
  commands: [{ cmd: "neko", desc: "random neko 🐾" }],

  register(bot: Bot, env: Env) {
    const fetch_neko = async () => {
      const d = await safeFetchJson<{ url: string }>("https://api.waifu.pics/sfw/neko");
      return d?.url ?? null;
    };

    bot.command("neko", async (ctx) => {
      const url = await fetch_neko();
      if (!url) { await ctx.reply("Failed to fetch neko, try again later."); return; }
      await ctx.replyWithPhoto(url, { reply_markup: refreshKb("neko_refresh"), reply_parameters: { message_id: ctx.message!.message_id } });
    });

    bot.callbackQuery("neko_refresh", async (ctx) => {
      const url = await fetch_neko();
      if (!url) { await ctx.answerCallbackQuery({ text: "Failed to fetch, try again." }); return; }
      const ok = await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, url, null, refreshKb("neko_refresh"));
      await ctx.answerCallbackQuery(ok ? undefined : { text: "Edit failed." });
    });
  },
});
