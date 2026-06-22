import type { Env } from "../core/types.js";
import { safeFetchJson } from "../core/helpers.js";

interface Hitokoto {
  hitokoto: string;
  from: string;
  from_who: string | null;
}

// Escape markdown special chars for Telegram's Rich Message markdown (Bot API 10.1+).
function escMd(s: string): string {
  return s.replace(/[\\*_`[\]]/g, "\\$&");
}

export async function updateQuote(env: Env): Promise<void> {
  if (!env.QUOTE_CHANNEL_ID || !env.QUOTE_MESSAGE_ID) {
    console.log("quote: QUOTE_CHANNEL_ID/QUOTE_MESSAGE_ID not set, skip");
    return;
  }

  const q = await safeFetchJson<Hitokoto>("https://v1.hitokoto.cn/");
  if (!q) { console.error("quote: failed to fetch hitokoto"); return; }

  const author = q.from_who ?? q.from ?? "Unknown";
  const now = Math.floor(Date.now() / 1000);
  const markdown = [
    `> 💭 ${escMd(q.hitokoto)}`,
    ``,
    `— **${escMd(author)}**`,
    ``,
  ].join("\n");

  const data = await safeFetchJson<{ ok: boolean; description?: string }>(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageText`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.QUOTE_CHANNEL_ID,
        message_id: Number(env.QUOTE_MESSAGE_ID),
        rich_message: { markdown },
      }),
    },
  );

  if (!data || (!data.ok && !data.description?.includes("message is not modified"))) {
    console.error("quote: editMessageText failed:", data?.description ?? "no response");
  }
}
