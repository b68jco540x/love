import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import { InlineKeyboard } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerAddon } from "../core/index.ts";
import { safeReply } from "../core/helpers.ts";

interface YtsTorrent {
  quality: string;
  type: string;
  size: string;
  hash: string;
}

interface YtsMovie {
  id: number;
  title: string;
  year: number;
  rating: number;
  runtime: number;
  genres: string[];
  summary: string;
  language: string;
  medium_cover_image: string;
  large_cover_image: string;
  torrents: YtsTorrent[];
}

const YTS_API = "https://yts.mx/api/v2";
const TRACKERS = [
  "udp://open.demonii.com:1337/announce",
  "udp://tracker.openbittorrent.com:80",
  "udp://tracker.coppersurfer.tk:6969",
  "udp://glotorrents.pw:6969/announce",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://torrent.gresille.org:80/announce",
  "udp://p4p.arenabg.com:1337",
  "udp://tracker.leechers-paradise.org:6969",
].map(t => `&tr=${encodeURIComponent(t)}`).join("");

function buildMagnet(hash: string, title: string): string {
  return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title)}${TRACKERS}`;
}

function qualityLabel(t: YtsTorrent): string {
  return `${t.quality} ${t.type !== "bluray" ? t.type : "BluRay"} · ${t.size}`;
}

async function searchMovies(query: string): Promise<YtsMovie[]> {
  const url = `${YTS_API}/list_movies.json?query_term=${encodeURIComponent(query)}&limit=5&sort_by=download_count`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const json = await res.json();
  return json?.data?.movies ?? [];
}

async function getMovie(id: number): Promise<YtsMovie | null> {
  const url = `${YTS_API}/movie_details.json?movie_id=${id}&with_images=true`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const json = await res.json();
  return json?.data?.movie ?? null;
}

registerAddon({
  name: "yts",
  commands: [{ cmd: "yts", desc: "download movies 🎬 <title>" }],

  register(bot: Bot, _env: Env) {
    bot.command("yts", async (ctx) => {
      const query = ctx.match?.trim() ?? "";
      if (!query) { await ctx.reply("Usage: /yts <movie title>"); return; }

      const loading = await ctx.reply("🔍 Searching YTS...", {
        reply_parameters: { message_id: ctx.message!.message_id },
      });

      try {
        const movies = await searchMovies(query);
        if (!movies.length) {
          await ctx.api.editMessageText(ctx.chat!.id, loading.message_id, `❌ No results for "${query}"`);
          return;
        }

        const kb = new InlineKeyboard();
        for (const m of movies) {
          const label = `🎬 ${m.title} (${m.year}) ⭐${m.rating}`;
          const cb = `yts_d:${m.id}`;
          if (cb.length <= 64) kb.text(label, cb).row();
        }

        await ctx.api.editMessageText(
          ctx.chat!.id, loading.message_id,
          `🔍 <b>Results for "${query}":</b>`,
          { parse_mode: "HTML", reply_markup: kb }
        );
      } catch (e) {
        await ctx.api.editMessageText(ctx.chat!.id, loading.message_id, `❌ ${(e as Error).message}`);
      }
    });

    bot.callbackQuery(/^yts_d:(\d+)$/, async (ctx) => {
      await ctx.answerCallbackQuery("�� Loading...");
      const id = parseInt(ctx.match[1]);

      try {
        const m = await getMovie(id);
        if (!m) { await ctx.editMessageText("❌ Movie not found."); return; }

        const kb = new InlineKeyboard();
        for (const t of m.torrents ?? []) {
          const label = `⬇️ ${qualityLabel(t)}`;
          const cb = `yts_m:${m.id}:${t.hash.slice(0, 10)}`;
          if (cb.length <= 64) kb.text(label, cb).row();
        }
        kb.text("‹ Back", `yts_b:${encodeURIComponent(m.title.slice(0, 30))}`);

        const info = [
          `🎬 <b>${m.title} (${m.year})</b>`,
          `⭐ ${m.rating}/10 · ⏱ ${m.runtime}min · 🌐 ${m.language.toUpperCase()}`,
          m.genres?.length ? `🏷 ${m.genres.join(", ")}` : "",
          ``,
          m.summary ? m.summary.slice(0, 300) + (m.summary.length > 300 ? "…" : "") : "",
          ``,
          `<b>Choose quality:</b>`,
        ].filter(s => s !== undefined).join("\n");

        if (m.large_cover_image) {
          await ctx.editMessageText("⬇️ Loading poster...");
          await ctx.deleteMessage();
          await ctx.replyWithPhoto(m.large_cover_image, {
            caption: info,
            parse_mode: "HTML",
            reply_markup: kb,
          });
        } else {
          await ctx.editMessageText(info, { parse_mode: "HTML", reply_markup: kb });
        }
      } catch (e) {
        await ctx.editMessageText(`❌ ${(e as Error).message}`);
      }
    });

    bot.callbackQuery(/^yts_m:(\d+):([a-fA-F0-9]+)$/, async (ctx) => {
      await ctx.answerCallbackQuery();
      const id = parseInt(ctx.match[1]);
      const hashPrefix = ctx.match[2];

      try {
        const m = await getMovie(id);
        if (!m) { await safeReply(ctx, "❌ Movie not found."); return; }

        const torrent = m.torrents?.find(t => t.hash.startsWith(hashPrefix));
        if (!torrent) { await safeReply(ctx, "❌ Torrent not found."); return; }

        const magnet = buildMagnet(torrent.hash, `${m.title} (${m.year}) ${torrent.quality}`);
        const text = [
          `✅ <b>${m.title} (${m.year})</b>`,
          `📦 ${qualityLabel(torrent)}`,
          ``,
          `<b>Magnet link:</b>`,
          `<code>${magnet}</code>`,
          ``,
          `<i>Copy magnet → paste ke 1DM/IDM/qBittorrent</i>`,
        ].join("\n");

        await safeReply(ctx, text, { parse_mode: "HTML" });
      } catch (e) {
        await safeReply(ctx, `❌ ${(e as Error).message}`);
      }
    });
  },
});
