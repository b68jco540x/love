import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { editPhoto, safeFetchJson, replyTo } from "../core/helpers.js";

interface WaifuItem {
  url: string;
  source?: string;
}
interface WaifuImResp {
  items?: WaifuItem[];
}
interface NekosBestResp {
  results?: { url: string; source_url?: string }[];
}

// Primary source: waifu.im /images (needs X-Api-Key; the key bypasses the
// Cloudflare challenge that blocks anonymous clients). Falls back to nekos.best
// for SFW when waifu.im is unset/unreachable. NSFW has no SFW fallback.
async function fetchWaifu(env: Env, nsfw: boolean): Promise<WaifuItem | null> {
  if (env.WAIFU_API_KEY) {
    const params = new URLSearchParams({ IsNsfw: nsfw ? "True" : "False", OrderBy: "Random" });
    const d = await safeFetchJson<WaifuImResp>(`https://api.waifu.im/images?${params}`, {
      headers: { "Accept": "application/json", "X-Api-Key": env.WAIFU_API_KEY },
    });
    const item = d?.items?.[0];
    if (item?.url) return item;
  }
  if (nsfw) return null;
  const f = await safeFetchJson<NekosBestResp>("https://nekos.best/api/v2/waifu");
  const r = f?.results?.[0];
  return r?.url ? { url: r.url, source: r.source_url } : null;
}

function waifuKb(nsfw: boolean, source?: string): InlineKeyboard {
  const kb = new InlineKeyboard().text("🔄 Refresh", nsfw ? "waifu_refresh_nsfw" : "waifu_refresh_sfw");
  if (source) kb.url("🔗 Source", source);
  return kb;
}

registerAddon({
  name: "waifu",
  commands: [{ cmd: "waifu", desc: "random waifu 🌸 [-nsfw]" }],

  register(bot: Bot, env: Env) {
    bot.command("waifu", async (ctx) => {
      const nsfw = (ctx.match?.trim() ?? "") === "-nsfw";
      const item = await fetchWaifu(env, nsfw);
      if (!item) { await ctx.reply("Failed to fetch waifu, try again later."); return; }
      await ctx.replyWithPhoto(item.url, { reply_markup: waifuKb(nsfw, item.source), reply_parameters: replyTo(ctx) });
    });

    for (const cb of ["waifu_refresh_sfw", "waifu_refresh_nsfw"]) {
      bot.callbackQuery(cb, async (ctx) => {
        const nsfw = cb === "waifu_refresh_nsfw";
        const item = await fetchWaifu(env, nsfw);
        if (!item) { await ctx.answerCallbackQuery({ text: "Failed to fetch, try again." }); return; }
        const ok = await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, item.url, null, waifuKb(nsfw, item.source));
        await ctx.answerCallbackQuery(ok ? undefined : { text: "Edit failed." });
      });
    }
  },
});
