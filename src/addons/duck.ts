import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { refreshKb, editPhoto, safeFetchJson } from "../core/helpers.js";

registerAddon({
  name: "duck",
  commands: [{ cmd: "duck", desc: "random duck 🦆" }],

  register(bot: Bot, env: Env) {
    const fetch_duck = async () => {
      const d = await safeFetchJson<{ url: string }>("https://random-d.uk/api/v2/quack");
      return d?.url ?? null;
    };

    bot.command("duck", async (ctx) => {
      const url = await fetch_duck();
      if (!url) { await ctx.reply("Failed to fetch duck, try again later."); return; }
      await ctx.replyWithPhoto(url, { reply_markup: refreshKb("duck_refresh"), reply_parameters: { message_id: ctx.message!.message_id } });
    });

    bot.callbackQuery("duck_refresh", async (ctx) => {
      const url = await fetch_duck();
      if (!url) { await ctx.answerCallbackQuery({ text: "Failed to fetch, try again." }); return; }
      const ok = await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, url, null, refreshKb("duck_refresh"));
      await ctx.answerCallbackQuery(ok ? undefined : { text: "Edit failed." });
    });
  },
});
