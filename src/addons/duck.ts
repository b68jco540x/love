import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { refreshKb, editPhoto } from "../core/helpers.js";

registerAddon({
  name: "duck",
  commands: [{ cmd: "duck", desc: "random duck 🦆" }],

  register(bot: Bot, env: Env) {
    const fetch_duck = async () => (await fetch("https://random-d.uk/api/v2/quack").then(r => r.json())).url as string;

    bot.command("duck", async (ctx) => {
      const url = await fetch_duck();
      await ctx.replyWithPhoto(url, { reply_markup: refreshKb("duck_refresh"), reply_parameters: { message_id: ctx.message!.message_id } });
    });

    bot.callbackQuery("duck_refresh", async (ctx) => {
      const url = await fetch_duck();
      await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, url, null, refreshKb("duck_refresh"));
      await ctx.answerCallbackQuery();
    });
  },
});
