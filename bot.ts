import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { UserFromGetMe } from "https://deno.land/x/grammy@v1.42.0/types.ts";

import type { Env } from "./core/types.ts";
import { loadAddons, generateHelp } from "./core/index.ts";

// Addons — remove an import to disable that command entirely
import "./addons/cat.ts";
import "./addons/dog.ts";
import "./addons/waifu.ts";
import "./addons/duck.ts";
import "./addons/fox.ts";
import "./addons/neko.ts";
import "./addons/nekos.ts";
import "./addons/weather.ts";
import "./addons/pokemon.ts";
import "./addons/anime.ts";
import "./addons/manga.ts";
import "./addons/rec.ts";

export type { Env };

let botInfo: UserFromGetMe | undefined;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
};
