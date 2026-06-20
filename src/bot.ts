import { Bot, webhookCallback } from "grammy";
import type { UserFromGetMe } from "grammy/types";

import type { Env } from "./core/types.js";
import { loadAddons, generateHelp } from "./core/index.js";

// Addons — remove an import to disable that command entirely
import "./addons/cat.js";
import "./addons/dog.js";
import "./addons/waifu.js";
import "./addons/duck.js";
import "./addons/fox.js";
import "./addons/neko.js";
import "./addons/nekos.js";
import "./addons/weather.js";
import "./addons/pokemon.js";
import "./addons/anime.js";
import "./addons/manga.js";
import "./addons/rec.js";
import "./addons/subs.js";
import { updateQuote } from "./addons/quote.js";

export type { Env };

let botInfo: UserFromGetMe | undefined;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const bot = new Bot(env.BOT_TOKEN, { botInfo });
      if (!botInfo) { await bot.init(); botInfo = bot.botInfo; }

      bot.command(["start", "help"], async (ctx) => {
        await ctx.reply(`*Commands:*\n\n${generateHelp()}`, { parse_mode: "Markdown", reply_parameters: { message_id: ctx.message!.message_id } });
      });

      loadAddons(bot, env);

      return await webhookCallback(bot, "cloudflare-mod")(request);
    } catch (e) {
      const err = e as Error;
      console.error("CRASH:", err.message, err.stack);
      return new Response(err.stack ?? err.message, { status: 500 });
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(updateQuote(env));
  },
};
