import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { refreshKb, editPhoto, safeFetchJson } from "../core/helpers.js";

registerAddon({
  name: "cat",
  commands: [{ cmd: "cat", desc: "random cat 🐱" }],

  register(bot: Bot, env: Env) {
    const fetch_cat = async () => {
      const d = await safeFetchJson<{ url: string }[]>("https://api.thecatapi.com/v1/images/search", {
        headers: env.CAT_API_KEY ? { "x-api-key": env.CAT_API_KEY } : {},
      });
      return d?.[0]?.url ?? null;
    };

    bot.command("cat", async (ctx) => {
      const url = await fetch_cat();
      if (!url) { await ctx.reply("Failed to fetch cat, try again later."); return; }
      await ctx.replyWithPhoto(url, { reply_markup: refreshKb("cat_refresh"), reply_parameters: { message_id: ctx.message!.message_id } });
    });

    bot.callbackQuery("cat_refresh", async (ctx) => {
      const url = await fetch_cat();
      if (!url) { await ctx.answerCallbackQuery({ text: "Failed to fetch, try again." }); return; }
      const ok = await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, url, null, refreshKb("cat_refresh"));
      await ctx.answerCallbackQuery(ok ? undefined : { text: "Edit failed." });
    });
  },
});
