import type { Bot } from "grammy";
import type { Env } from "./types.js";
import { registerAddon } from "./index.js";
import { refreshKb, editPhoto, replyTo } from "./helpers.js";

export interface ImageAddonConfig {
  /** Addon name (shown internally / used as registry key). */
  name: string;
  /** Slash command, e.g. "cat" -> /cat. */
  command: string;
  /** Help text shown in /help and the command menu. */
  desc: string;
  /** Fetches a fresh image URL, or null on any failure. */
  fetch(env: Env): Promise<string | null>;
}

// Factory for "random image + 🔄 Refresh" addons (cat, dog, duck, fox, neko, ...).
// Every such addon was previously ~30 lines of identical boilerplate; this
// collapses each one to a small config object while keeping behavior — and the
// `<command>_refresh` callback data — byte-for-byte identical.
export function createImageAddon(cfg: ImageAddonConfig): void {
  const cbData = `${cfg.command}_refresh`;

  registerAddon({
    name: cfg.name,
    commands: [{ cmd: cfg.command, desc: cfg.desc }],

    register(bot: Bot, env: Env) {
      bot.command(cfg.command, async (ctx) => {
        const url = await cfg.fetch(env);
        if (!url) { await ctx.reply(`Failed to fetch ${cfg.command}, try again later.`); return; }
        await ctx.replyWithPhoto(url, { reply_markup: refreshKb(cbData), reply_parameters: replyTo(ctx) });
      });

      bot.callbackQuery(cbData, async (ctx) => {
        const url = await cfg.fetch(env);
        if (!url) { await ctx.answerCallbackQuery({ text: "Failed to fetch, try again." }); return; }
        const ok = await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, url, null, refreshKb(cbData));
        await ctx.answerCallbackQuery(ok ? undefined : { text: "Edit failed." });
      });
    },
  });
}
