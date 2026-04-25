import { InlineKeyboard } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Context } from "https://deno.land/x/grammy@v1.42.0/mod.ts";

export function refreshKb(cbData: string): InlineKeyboard {
  return new InlineKeyboard().text("🔄 Refresh", cbData);
}

export function waifuKb(nsfw: boolean, url: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔄 Refresh", nsfw ? "waifu_refresh_nsfw" : "waifu_refresh_sfw")
    .url("🔗 Source", url);
}

export async function editPhoto(
  token: string,
  chatId: number,
  messageId: number,
  photoUrl: string,
  caption: string | null,
  kb: InlineKeyboard,
) {
  const media: Record<string, unknown> = { type: "photo", media: photoUrl };
  if (caption) { media.caption = caption; media.parse_mode = "Markdown"; }
  await fetch(`https://api.telegram.org/bot${token}/editMessageMedia`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, media, reply_markup: kb }),
  });
}

export async function safeReply(ctx: Context, text: string, opts: Record<string, unknown> = {}) {
  try { await ctx.reply(text, { parse_mode: "Markdown", ...opts }); }
  catch { await ctx.reply(text, opts); }
}
