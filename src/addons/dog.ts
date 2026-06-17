import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { refreshKb, editPhoto } from "../core/helpers.js";

registerAddon({
  name: "dog",
  commands: [{ cmd: "dog", desc: "random dog 🐶" }],

  register(bot: Bot, env: Env) {
    const fetch_dog = async () => {
      const d = await fetch("https://api.thedogapi.com/v1/images/search", {
        headers: env.DOG_API_KEY ? { "x-api-key": env.DOG_API_KEY } : {},
      }).then(r => r.json());
      return d[0]?.url as string;
    };

    bot.command("dog", async (ctx) => {
      const url = await fetch_dog();
      await ctx.replyWithPhoto(url, { reply_markup: refreshKb("dog_refresh"), reply_parameters: { message_id: ctx.message!.message_id } });
    });

    bot.callbackQuery("dog_refresh", async (ctx) => {
      const url = await fetch_dog();
      await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, url, null, refreshKb("dog_refresh"));
      await ctx.answerCallbackQuery();
    });
  },
});
