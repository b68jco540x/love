import type { Env } from "../core/types.js";

interface Hitokoto {
  hitokoto: string;
  from: string;
  from_who: string | null;
}

// Cron entrypoint — edits a fixed channel msg with a fresh hitokoto.cn quote.
// NOTE: Telegram editMessageText only works on msgs originally sent by THIS bot.
export async function updateQuote(env: Env): Promise<void> {
  if (!env.QUOTE_CHANNEL_ID || !env.QUOTE_MESSAGE_ID) {
    console.log("quote: QUOTE_CHANNEL_ID/QUOTE_MESSAGE_ID not set, skip");
    return;
  }

  const q = await fetch("https://v1.hitokoto.cn/").then(r => r.json() as Promise<Hitokoto>);
  const author = q.from_who ?? q.from ?? "Unknown";
  const text = `\u{1F4AD} ${q.hitokoto}\n\n\u2014 ${author}`;

  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.QUOTE_CHANNEL_ID,
      message_id: Number(env.QUOTE_MESSAGE_ID),
      text,
    }),
  });

  const data = await res.json() as { ok: boolean; description?: string };
  if (!data.ok && !data.description?.includes("message is not modified")) {
    console.error("quote: editMessageText failed:", data.description);
  }
}
