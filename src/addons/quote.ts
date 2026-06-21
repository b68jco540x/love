import type { Env } from "../core/types.js";

interface Hitokoto {
  hitokoto: string;
  from: string;
  from_who: string | null;
}

async function safeFetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) { console.error(`fetch ${res.status}: ${url}`); return null; }
    return await res.json() as T;
  } catch (err) {
    console.error(`fetch error: ${url}`, err);
    return null;
  }
}

// Cron entrypoint — edits a fixed channel msg with a fresh hitokoto.cn quote.
// NOTE: Telegram editMessageText only works on msgs originally sent by THIS bot.
export async function updateQuote(env: Env): Promise<void> {
  if (!env.QUOTE_CHANNEL_ID || !env.QUOTE_MESSAGE_ID) {
    console.log("quote: QUOTE_CHANNEL_ID/QUOTE_MESSAGE_ID not set, skip");
    return;
  }

  const q = await safeFetchJson<Hitokoto>("https://v1.hitokoto.cn/");
  if (!q) { console.error("quote: failed to fetch hitokoto"); return; }

  const author = q.from_who ?? q.from ?? "Unknown";
  const text = `💭 ${q.hitokoto}\n\n— ${author}`;

  const data = await safeFetchJson<{ ok: boolean; description?: string }>(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageText`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.QUOTE_CHANNEL_ID,
        message_id: Number(env.QUOTE_MESSAGE_ID),
        text,
      }),
    },
  );

  if (!data || (!data.ok && !data.description?.includes("message is not modified"))) {
    console.error("quote: editMessageText failed:", data?.description ?? "no response");
  }
}
