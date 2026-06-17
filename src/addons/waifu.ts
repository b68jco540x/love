import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { waifuKb, editPhoto } from "../core/helpers.js";

const fetchWaifu = async (nsfw: boolean): Promise<string> => {
  const url = nsfw ? "https://api.waifu.pics/nsfw/waifu" : "https://api.waifu.pics/sfw/waifu";
  const d = await fetch(url).then(r => r.json());
  return d.url;
};

registerAddon({
  name: "waifu",
  commands: [{ cmd: "waifu", desc: "random waifu 🌸" }],

  register(bot: Bot, env: Env) {
    bot.command("waifu", async (ctx) => {
      const nsfw = (ctx.match?.trim() ?? "") === "-nsfw";
      const url = await fetchWaifu(nsfw);
      await ctx.replyWithPhoto(url, { reply_markup: waifuKb(nsfw, url), reply_parameters: { message_id: ctx.message!.message_id } });
    });

    for (const cb of ["waifu_refresh_sfw", "waifu_refresh_nsfw"]) {
      bot.callbackQuery(cb, async (ctx) => {
        const nsfw = cb === "waifu_refresh_nsfw";
        const url = await fetchWaifu(nsfw);
        await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, url, null, waifuKb(nsfw, url));
        await ctx.answerCallbackQuery();
      });
    }
  },
});
