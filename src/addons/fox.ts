import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { refreshKb, editPhoto, safeFetchJson } from "../core/helpers.js";

registerAddon({
  name: "fox",
  commands: [{ cmd: "fox", desc: "random fox 🦊" }],

  register(bot: Bot, env: Env) {
    const fetch_fox = async () => {
      const d = await safeFetchJson<{ image: string }>("https://randomfox.ca/floof/");
      return d?.image ?? null;
    };

    bot.command("fox", async (ctx) => {
      const url = await fetch_fox();
      if (!url) { await ctx.reply("Failed to fetch fox, try again later."); return; }
      await ctx.replyWithPhoto(url, { reply_markup: refreshKb("fox_refresh"), reply_parameters: { message_id: ctx.message!.message_id } });
    });

    bot.callbackQuery("fox_refresh", async (ctx) => {
      const url = await fetch_fox();
      if (!url) { await ctx.answerCallbackQuery({ text: "Failed to fetch, try again." }); return; }
      const ok = await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, url, null, refreshKb("fox_refresh"));
      await ctx.answerCallbackQuery(ok ? undefined : { text: "Edit failed." });
    });
  },
});
