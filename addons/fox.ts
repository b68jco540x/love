import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerAddon } from "../core/index.ts";
import { refreshKb, editPhoto } from "../core/helpers.ts";

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
