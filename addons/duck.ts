import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerAddon } from "../core/index.ts";
import { refreshKb, editPhoto } from "../core/helpers.ts";

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
