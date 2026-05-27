import { InlineKeyboard } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerAddon } from "../core/index.ts";

// VidSrc embed URLs (TMDB id works directly, no IMDB needed)
// Movie:   https://vidsrc.to/embed/movie/{tmdbId}
// TV show: https://vidsrc.to/embed/tv/{tmdbId}
// Episode: https://vidsrc.to/embed/tv/{tmdbId}/{season}/{episode}
//
// Callback data:
//   vs_m:{tmdbId}                    movie → send embed
//   vs_t:{tmdbId}:{seasons}          tv    → show season picker  (seasons = "1,2,3")
//   vs_e:{tmdbId}:{season}:{maxEp}   ep    → show episode picker
//   vs_w:{tmdbId}:{season}:{ep}      watch → send embed

const TMDB = "https://api.themoviedb.org/3";
const VS   = "https://vidsrc.to/embed";

// ── TMDB helpers ──────────────────────────────────────────────────────────

async function tmdbSearch(query: string, apiKey: string) {
  const url = `${TMDB}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  const j = await res.json();
  return (j?.results ?? []).filter((r: any) =>
    (r.media_type === "movie" || r.media_type === "tv") && (r.title || r.name)
  ) as any[];
}

async function tmdbTvDetail(tmdbId: string, apiKey: string) {
  const res = await fetch(`${TMDB}/tv/${tmdbId}?api_key=${apiKey}`, { headers: { "Accept": "application/json" } });
  const j = await res.json();
  return {
    seasons: (j?.seasons ?? [])
      .filter((s: any) => s.season_number > 0)      // skip specials (season 0)
      .map((s: any) => ({ n: s.season_number, ep: s.episode_count })) as { n: number; ep: number }[],
  };
}

// ── Format helpers ────────────────────────────────────────────────────────

function typeIcon(t: string) { return t === "movie" ? "🎬" : "📺"; }

function formatResults(items: any[]) {
  return items.slice(0, 8).map((item, i) => {
    const title = item.title ?? item.name;
    const year  = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
    return `${i + 1}. ${typeIcon(item.media_type)} ${title}${year ? ` (${year})` : ""}`;
  }).join("\n");
}

function embedMsg(title: string, url: string, extraInfo = "") {
  return `<b>${title}</b>${extraInfo}\n\n` +
    `▶️ <a href="${url}">Watch on VidSrc</a>\n\n` +
    `<i>Opens in browser · works on any device</i>`;
}

// ── Addon ─────────────────────────────────────────────────────────────────

registerAddon({
  name: "vidsrc",
  commands: [{ cmd: "movie", desc: "search movies & series <title>" }],

  register(bot: Bot, env: Env) {
    const apiKey = (env as any).TMDB_API_KEY as string | undefined;

    if (!apiKey) {
      // Register command that explains missing key
      bot.command("movie", (ctx) =>
        ctx.reply("❌ TMDB_API_KEY not set. Add it to your bot secrets.")
      );
      return;
    }

    // /movie <title> → search and show inline buttons
    bot.command("movie", async (ctx) => {
      const query = ctx.match?.trim() ?? "";
      if (!query) { await ctx.reply("Usage: /movie <title>"); return; }

      const loading = await ctx.reply("🔍 Searching...", {
        reply_parameters: { message_id: ctx.message!.message_id },
      });

      try {
        const items = await tmdbSearch(query, apiKey);
        if (!items.length) {
          await ctx.api.editMessageText(ctx.chat!.id, loading.message_id, `❌ No results for "${query}".`);
          return;
        }

        const kb = new InlineKeyboard();
        for (const item of items.slice(0, 8)) {
          const title = item.title ?? item.name;
          const year  = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
          const label = `${typeIcon(item.media_type)} ${title}${year ? ` (${year})` : ""}`;
          const cb = item.media_type === "movie"
            ? `vs_m:${item.id}`
            : `vs_t:${item.id}`;
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

    // Tap movie → send embed link directly
    bot.callbackQuery(/^vs_m:(\d+)$/, async (ctx) => {
      await ctx.answerCallbackQuery();
      const tmdbId = ctx.match[1];
      const title = ctx.callbackQuery.message?.reply_markup?.inline_keyboard
        .flat().find(b => "callback_data" in b && b.callback_data === ctx.callbackQuery.data)?.text?.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]\s*/u, "")
        ?? "Movie";

      const url = `${VS}/movie/${tmdbId}`;
      await ctx.editMessageText(embedMsg(title, url), {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard(),
      });
    });

    // Tap TV show → fetch seasons, show season buttons
    bot.callbackQuery(/^vs_t:(\d+)$/, async (ctx) => {
      await ctx.answerCallbackQuery("⏳ Loading seasons...");
      const tmdbId = ctx.match[1];
      const title = ctx.callbackQuery.message?.reply_markup?.inline_keyboard
        .flat().find(b => "callback_data" in b && b.callback_data === ctx.callbackQuery.data)?.text?.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]\s*/u, "")
        ?? "Series";

      try {
        const { seasons } = await tmdbTvDetail(tmdbId, apiKey);
        if (!seasons.length) {
          await ctx.editMessageText("❌ No season data found.", { reply_markup: new InlineKeyboard() });
          return;
        }

        const kb = new InlineKeyboard();
        for (const s of seasons) {
          const cb = `vs_e:${tmdbId}:${s.n}:${s.ep}`;
          if (cb.length <= 64) kb.text(`S${s.n} (${s.ep} eps)`, cb);
          if (seasons.indexOf(s) % 4 === 3) kb.row(); // 4 per row
        }
        kb.row();
        // Also add "Watch S1E1" quick button
        const quickCb = `vs_w:${tmdbId}:1:1`;
        if (quickCb.length <= 64) kb.text("▶️ Watch S1E1", quickCb);

        await ctx.editMessageText(
          `📺 <b>${title}</b>\n\nChoose a season:`,
          { parse_mode: "HTML", reply_markup: kb }
        );
      } catch (e) {
        await ctx.editMessageText(`❌ ${(e as Error).message}`, { reply_markup: new InlineKeyboard() });
      }
    });

    // Tap season → show episode buttons (first 10 eps + "more" navigation)
    bot.callbackQuery(/^vs_e:(\d+):(\d+):(\d+)$/, async (ctx) => {
      await ctx.answerCallbackQuery();
      const [, tmdbId, seasonStr, maxEpStr] = ctx.match;
      const season = parseInt(seasonStr);
      const maxEp  = parseInt(maxEpStr);

      const kb = new InlineKeyboard();
      const show = Math.min(maxEp, 12);
      for (let ep = 1; ep <= show; ep++) {
        const cb = `vs_w:${tmdbId}:${season}:${ep}`;
        if (cb.length <= 64) kb.text(`E${ep}`, cb);
        if (ep % 6 === 0) kb.row();
      }
      if (maxEp > 12) {
        kb.row().text("More episodes ›", `vs_e2:${tmdbId}:${season}:${maxEp}:13`);
      }
      kb.row().text("‹ Seasons", `vs_t:${tmdbId}`);

      await ctx.editMessageText(
        `📺 Season ${season} — choose episode:`,
        { reply_markup: kb }
      );
    });

    // More episodes (page 2+)
    bot.callbackQuery(/^vs_e2:(\d+):(\d+):(\d+):(\d+)$/, async (ctx) => {
      await ctx.answerCallbackQuery();
      const [, tmdbId, seasonStr, maxEpStr, fromStr] = ctx.match;
      const season = parseInt(seasonStr);
      const maxEp  = parseInt(maxEpStr);
      const from   = parseInt(fromStr);

      const kb = new InlineKeyboard();
      const to = Math.min(from + 11, maxEp);
      for (let ep = from; ep <= to; ep++) {
        const cb = `vs_w:${tmdbId}:${season}:${ep}`;
        if (cb.length <= 64) kb.text(`E${ep}`, cb);
        if ((ep - from + 1) % 6 === 0) kb.row();
      }
      if (to < maxEp) {
        kb.row().text("More ›", `vs_e2:${tmdbId}:${season}:${maxEp}:${to + 1}`);
      }
      kb.row().text("‹ Back", `vs_e:${tmdbId}:${season}:${maxEp}`);

      await ctx.editMessageText(
        `📺 Season ${season} — episodes ${from}–${to}:`,
        { reply_markup: kb }
      );
    });

    // Tap episode → send embed link
    bot.callbackQuery(/^vs_w:(\d+):(\d+):(\d+)$/, async (ctx) => {
      await ctx.answerCallbackQuery();
      const [, tmdbId, season, episode] = ctx.match;
      const url = `${VS}/tv/${tmdbId}/${season}/${episode}`;
      const titleLine = ctx.callbackQuery.message?.text?.split("\n")[0] ?? "Series";

      const kb = new InlineKeyboard();
      // Prev/next episode navigation
      const prevEp = parseInt(episode) - 1;
      const nextEp = parseInt(episode) + 1;
      if (prevEp >= 1) kb.text("⬅️", `vs_w:${tmdbId}:${season}:${prevEp}`);
      kb.text("🔢 Episodes", `vs_e:${tmdbId}:${season}:99`);
      kb.text("➡️", `vs_w:${tmdbId}:${season}:${nextEp}`);

      await ctx.editMessageText(
        embedMsg(titleLine, url, ` — S${season}E${episode}`),
        { parse_mode: "HTML", reply_markup: kb }
      );
    });
  },
});
