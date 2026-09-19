import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";

export function refreshKb(cbData: string): InlineKeyboard {
  return new InlineKeyboard().text("🔄 Refresh", cbData);
}

// Wraps fetch+json with try/catch + .ok check. Returns null on any failure
// (network error, non-2xx, bad json) instead of throwing into the handler.
export async function safeFetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const headers = { "User-Agent": "love-tg-bot/1.0 (+https://github.com/b68jco540x/love)", ...(init?.headers ?? {}) };
    const res = await fetch(url, { ...init, headers });
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

export const JIKAN_BASE_URL = "https://jikan-edge.lucas-hdo.workers.dev/v1";

// Jikan intermittently 504s ("Jikan failed to connect to MyAnimeList") on
// otherwise-valid requests, independent of client/IP - known upstream issue
// (jikan-me/jikan-rest#610). Retry a couple times with backoff before giving up.
export async function fetchJikanJson<T = unknown>(pathOrUrl: string, retries = 2, delayMs = 500): Promise<T | null> {
  const url = pathOrUrl.startsWith("/") ? `${JIKAN_BASE_URL}${pathOrUrl}` : pathOrUrl;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await safeFetchJson<T>(url);
    if (res) return res;
    if (attempt < retries) await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
  }
  return null;
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

// Builds the reply_parameters value that quotes the user's triggering message.
// Centralizes the `ctx.message!.message_id` access repeated across every addon.
export function replyTo(ctx: Context): { message_id: number } {
  return { message_id: ctx.message!.message_id };
}

// Shared "info card" reply: send a photo with a Markdown caption when an image
// is available, otherwise fall back to a plain Markdown text reply. Both paths
// quote the triggering message. Used by anime/manga/pokemon/tmdb/rec.
export async function replyWithPhotoOrText(
  ctx: Context,
  photo: string | null | undefined,
  text: string,
): Promise<void> {
  if (photo) {
    await ctx.replyWithPhoto(photo, {
      caption: text,
      parse_mode: "Markdown",
      reply_parameters: replyTo(ctx),
    });
  } else {
    await safeReply(ctx, text, { reply_parameters: replyTo(ctx) });
  }
}
