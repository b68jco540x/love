import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { refreshKb, editPhoto } from "../core/helpers.js";

registerAddon({
  name: "fox",
  commands: [{ cmd: "fox", desc: "random fox 🦊" }],

  register(bot: Bot, env: Env) {
    const fetch_fox = async () => (await fetch("https://randomfox.ca/floof/").then(r => r.json())).image as string;

    bot.command("fox", async (ctx) => {
      const url = await fetch_fox();
      await ctx.replyWithPhoto(url, { reply_markup: refreshKb("fox_refresh"), reply_parameters: { message_id: ctx.message!.message_id } });
    });

    bot.callbackQuery("fox_refresh", async (ctx) => {
      const url = await fetch_fox();
      await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, url, null, refreshKb("fox_refresh"));
      await ctx.answerCallbackQuery();
    });
  },
});
