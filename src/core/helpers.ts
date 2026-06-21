import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";

export function refreshKb(cbData: string): InlineKeyboard {
  return new InlineKeyboard().text("🔄 Refresh", cbData);
}

export function waifuKb(nsfw: boolean, url: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔄 Refresh", nsfw ? "waifu_refresh_nsfw" : "waifu_refresh_sfw")
    .url("🔗 Source", url);
}

// Wraps fetch+json with try/catch + .ok check. Returns null on any failure
// (network error, non-2xx, bad json) instead of throwing into the handler.
export async function safeFetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      console.error(`fetch ${res.status} ${res.statusText}: ${url}`);
      return null;
    }
    return await res.json() as T;
  } catch (err) {
    console.error(`fetch error: ${url}`, err);
    return null;
  }
}

export async function editPhoto(
  token: string,
  chatId: number,
  messageId: number,
  photoUrl: string,
  caption: string | null,
  kb: InlineKeyboard,
): Promise<boolean> {
  const media: Record<string, unknown> = { type: "photo", media: photoUrl };
  if (caption) { media.caption = caption; media.parse_mode = "Markdown"; }
  const data = await safeFetchJson<{ ok: boolean; description?: string }>(
    `https://api.telegram.org/bot${token}/editMessageMedia`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, media, reply_markup: kb }),
    },
  );
  if (!data || !data.ok) {
    console.error("editPhoto failed:", data?.description ?? "no response");
    return false;
  }
  return true;
}

export async function safeReply(ctx: Context, text: string, opts: Record<string, unknown> = {}) {
  try { await ctx.reply(text, { parse_mode: "Markdown", ...opts }); }
  catch { await ctx.reply(text, opts); }
}
