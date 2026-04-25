import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerAddon } from "../core/index.ts";
import { refreshKb, editPhoto } from "../core/helpers.ts";

registerAddon({
  name: "cat",
  commands: [{ cmd: "cat", desc: "random cat 🐱" }],

  register(bot: Bot, env: Env) {
    const fetch_cat = async () => {
      const d = await fetch("https://api.thecatapi.com/v1/images/search", {
        headers: env.CAT_API_KEY ? { "x-api-key": env.CAT_API_KEY } : {},
      }).then(r => r.json());
      return d[0]?.url as string;
    };

    bot.command("cat", async (ctx) => {
      const url = await fetch_cat();
      await ctx.replyWithPhoto(url, { reply_markup: refreshKb("cat_refresh"), reply_parameters: { message_id: ctx.message!.message_id } });
    });

    bot.callbackQuery("cat_refresh", async (ctx) => {
      const url = await fetch_cat();
      await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, url, null, refreshKb("cat_refresh"));
      await ctx.answerCallbackQuery();
    });
  },
});
