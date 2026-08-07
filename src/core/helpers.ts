import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";

export function refreshKb(cbData: string): InlineKeyboard {
  return new InlineKeyboard().text("🔄 Refresh", cbData);
}

// Default headers sent with every safeFetchJson call. Some public APIs (Jikan,
// AniList) sit behind bot-detection (Cloudflare) or scraper blocklists that key
// off a missing/generic User-Agent - Workers' default fetch() sends none, which
// increases the odds of a silent 403/challenge response. Sending a real UA and
// Accept header is the standard mitigation.
const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent": "love-telegram-bot/1.0 (+https://github.com/b68jco540x/love)",
  "Accept": "application/json",
};

interface SafeFetchOpts {
  // Extra attempts after the first, only used for 429 / 5xx / network errors.
  retries?: number;
  // Per-attempt timeout in ms. Cloudflare Workers has its own subrequest limits,
  // but a hung upstream (e.g. Jikan under load) can otherwise stall the handler.
  timeoutMs?: number;
}

// Wraps fetch+json with try/catch + .ok check, a couple of retries for
// transient failures (429 / 5xx / network), and a timeout per attempt.
// Returns null on any final failure (network error, non-2xx, bad json)
// instead of throwing into the handler. The actual failure reason (status,
// response body, or thrown error) is always logged via console.error so it
// shows up in `wrangler tail` / the Workers dashboard - the caller only ever
// sees null, by design, so every addon should treat null as "tell the user
// to try again" and rely on the logs to diagnose *why*.
export async function safeFetchJson<T = unknown>(
  url: string,
  init?: RequestInit,
  opts: SafeFetchOpts = {},
): Promise<T | null> {
  const { retries = 1, timeoutMs = 8000 } = opts;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        headers: { ...DEFAULT_HEADERS, ...(init?.headers as Record<string, string> | undefined ?? {}) },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`fetch ${res.status} ${res.statusText}: ${url} :: ${body.slice(0, 300)}`);

        // Only retry on rate-limit / transient server errors. A 403 from bot
        // detection or a plain 404 won't fix itself on retry.
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          const retryAfterHeader = Number(res.headers.get("retry-after"));
          const delayMs = (Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
            ? retryAfterHeader
            : attempt + 1) * 1000;
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        return null;
      }

      return await res.json() as T;
    } catch (err) {
      clearTimeout(timer);
      const reason = err instanceof Error && err.name === "AbortError" ? "timeout" : err;
      console.error(`fetch error (attempt ${attempt + 1}/${retries + 1}): ${url}`, reason);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      return null;
    }
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
