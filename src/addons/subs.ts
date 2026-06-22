import { InlineKeyboard } from "grammy";
import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { safeReply, safeFetchJson } from "../core/helpers.js";

interface TmdbResult {
  id: number;
  media_type: "movie" | "tv" | "person" | "collection";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
}

interface TmdbTvDetails {
  name: string;
  first_air_date?: string;
  seasons: { season_number: number; episode_count: number }[];
}

interface TmdbSeasonDetails {
  episodes?: { episode_number: number }[];
}

interface WyzieSub {
  url: string;
  display: string;
  format: string;
  source: string;
}

function parseQuery(raw: string) {
  let q = raw.trim();
  let season: number | undefined;
  let episode: number | undefined;
  let language = "en";

  const seMatch = q.match(/\bs(\d{1,2})e(\d{1,3})\b/i);
  if (seMatch) {
    season = parseInt(seMatch[1], 10);
    episode = parseInt(seMatch[2], 10);
    q = q.replace(seMatch[0], "").trim();
  }

  const langMatch = q.match(/\blang:(\w{2})\b/i);
  if (langMatch) {
    language = langMatch[1].toLowerCase();
    q = q.replace(langMatch[0], "").trim();
  }

  return { title: q, season, episode, language };
}

function buildGrid(labels: { label: string; data: string }[], perRow = 5): InlineKeyboard {
  const kb = new InlineKeyboard();
  labels.forEach((item, i) => {
    kb.text(item.label, item.data);
    if ((i + 1) % perRow === 0) kb.row();
  });
  return kb;
}

function subsText(title: string, year: string, tag: string, subs: WyzieSub[] | null): string {
  if (!subs) return `Failed to fetch subtitles for *${title}*${year ? ` (${year})` : ""}${tag}, try again later.`;
  if (subs.length === 0) return `No subtitles found for *${title}*${year ? ` (${year})` : ""}${tag}.`;
  const lines = subs.slice(0, 8).map((sub, i) =>
    `${i + 1}. [${sub.display} — ${sub.source}](${sub.url}) \`.${sub.format}\``
  );
  return [`*${title}*${year ? ` (${year})` : ""}${tag}`, ``, ...lines].join("\n");
}

registerAddon({
  name: "subs",
  commands: [{ cmd: "subs", desc: "subtitle downloader 🎬 <title> [lang:id]" }],

  register(bot: Bot, env: Env) {
    function fetchSubs(tmdbId: number, language: string, season?: number, episode?: number) {
      const params = new URLSearchParams({ id: String(tmdbId), key: env.WYZIE_API_KEY!, language });
      if (season !== undefined && episode !== undefined) {
        params.set("season", String(season));
        params.set("episode", String(episode));
      }
      return safeFetchJson<WyzieSub[]>(`https://sub.wyzie.io/search?${params}`);
    }

    function fetchTv(tmdbId: number) {
      return safeFetchJson<TmdbTvDetails>(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${env.TMDB_API_KEY}`);
    }

    function seasonKeyboard(tmdbId: number, seasons: TmdbTvDetails["seasons"], lang: string) {
      const items = seasons
        .filter(s => s.season_number > 0 && s.episode_count > 0)
        .map(s => ({ label: `S${s.season_number}`, data: `subs:se:${tmdbId}:${s.season_number}:${lang}` }));
      return buildGrid(items);
    }

    bot.command("subs", async (ctx) => {
      const raw = ctx.match?.trim() ?? "";
      if (!raw) { await ctx.reply("Usage: /subs <title> [S01E01] [lang:id]"); return; }
      if (!env.TMDB_API_KEY || !env.WYZIE_API_KEY) {
        await ctx.reply("TMDB_API_KEY / WYZIE_API_KEY not configured."); return;
      }

      const { title, season, episode, language } = parseQuery(raw);
      if (!title) { await ctx.reply("Usage: /subs <title> [S01E01] [lang:id]"); return; }

      const tmdb = await safeFetchJson<{ results?: TmdbResult[] }>(
        `https://api.themoviedb.org/3/search/multi?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(title)}`
      );
      if (!tmdb) { await ctx.reply("Failed to reach TMDB, try again later."); return; }

      const match = tmdb.results?.find(r => r.media_type === "movie" || r.media_type === "tv");
      if (!match) { await ctx.reply(`"${title}" not found on TMDB.`); return; }

      const replyOpts = { reply_parameters: { message_id: ctx.message!.message_id }, link_preview_options: { is_disabled: true } };

      if (match.media_type === "movie") {
        const displayTitle = match.title ?? title;
        const year = match.release_date?.slice(0, 4) ?? "";
        const subs = await fetchSubs(match.id, language);
        await safeReply(ctx, subsText(displayTitle, year, "", subs), replyOpts);
        return;
      }

      // legacy: explicit S01E01 in text -> skip buttons entirely
      if (season !== undefined && episode !== undefined) {
        const displayTitle = match.name ?? title;
        const year = match.first_air_date?.slice(0, 4) ?? "";
        const tag = ` S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
        const subs = await fetchSubs(match.id, language, season, episode);
        await safeReply(ctx, subsText(displayTitle, year, tag, subs), replyOpts);
        return;
      }

      // TV, no S/E given -> season picker buttons
      const tv = await fetchTv(match.id);
      if (!tv) { await ctx.reply("Failed to fetch show details, try again later."); return; }
      const kb = seasonKeyboard(match.id, tv.seasons ?? [], language);
      if (kb.inline_keyboard.length === 0) { await ctx.reply(`No seasons found for *${tv.name}*.`, { parse_mode: "Markdown" }); return; }

      await ctx.reply(`*${tv.name}* — pilih season:`, { parse_mode: "Markdown", reply_markup: kb, reply_parameters: { message_id: ctx.message!.message_id } });
    });

    bot.callbackQuery(/^subs:se:(\d+):(\d+):(\w{2})$/, async (ctx) => {
      const [, idStr, seasonStr, lang] = ctx.match!;
      const tmdbId = Number(idStr);
      const season = Number(seasonStr);

      const seasonData = await safeFetchJson<TmdbSeasonDetails>(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?api_key=${env.TMDB_API_KEY}`
      );
      if (!seasonData) { await ctx.answerCallbackQuery({ text: "Failed to fetch episodes, try again." }); return; }

      const episodes = seasonData.episodes ?? [];
      if (episodes.length === 0) { await ctx.answerCallbackQuery({ text: "No episodes found." }); return; }

      const items = episodes.map(e => ({ label: `E${e.episode_number}`, data: `subs:ep:${tmdbId}:${season}:${e.episode_number}:${lang}` }));
      const kb = buildGrid(items);
      kb.row().text("« Season", `subs:back:${tmdbId}:${lang}`);

      await ctx.editMessageText(`Season ${season} — pilih episode:`, { reply_markup: kb });
      await ctx.answerCallbackQuery();
    });

    bot.callbackQuery(/^subs:ep:(\d+):(\d+):(\d+):(\w{2})$/, async (ctx) => {
      const [, idStr, seasonStr, episodeStr, lang] = ctx.match!;
      const tmdbId = Number(idStr);
      const season = Number(seasonStr);
      const episode = Number(episodeStr);

      await ctx.answerCallbackQuery({ text: "Fetching subtitles…" });

      const tv = await fetchTv(tmdbId);
      const subs = await fetchSubs(tmdbId, lang, season, episode);
      const tag = ` S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
      const year = tv?.first_air_date?.slice(0, 4) ?? "";

      await ctx.editMessageText(subsText(tv?.name ?? "?", year, tag, subs), { parse_mode: "Markdown", link_preview_options: { is_disabled: true } });
    });

    bot.callbackQuery(/^subs:back:(\d+):(\w{2})$/, async (ctx) => {
      const [, idStr, lang] = ctx.match!;
      const tmdbId = Number(idStr);

      const tv = await fetchTv(tmdbId);
      if (!tv) { await ctx.answerCallbackQuery({ text: "Failed to fetch show details, try again." }); return; }
      const kb = seasonKeyboard(tmdbId, tv.seasons ?? [], lang);

      await ctx.editMessageText(`*${tv.name}* — pilih season:`, { parse_mode: "Markdown", reply_markup: kb });
      await ctx.answerCallbackQuery();
    });
  },
});
