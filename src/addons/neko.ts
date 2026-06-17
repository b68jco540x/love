import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { refreshKb, editPhoto } from "../core/helpers.js";

registerAddon({
  name: "neko",
  commands: [{ cmd: "neko", desc: "random neko 🐾" }],

  register(bot: Bot, env: Env) {
    const fetch_neko = async () => (await fetch("https://api.waifu.pics/sfw/neko").then(r => r.json())).url as string;

    bot.command("neko", async (ctx) => {
      const url = await fetch_neko();
      await ctx.replyWithPhoto(url, { reply_markup: refreshKb("neko_refresh"), reply_parameters: { message_id: ctx.message!.message_id } });
    });

    bot.callbackQuery("neko_refresh", async (ctx) => {
      const url = await fetch_neko();
      await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, url, null, refreshKb("neko_refresh"));
      await ctx.answerCallbackQuery();
    });
  },
});
