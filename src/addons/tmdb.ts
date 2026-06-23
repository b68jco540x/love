import { InlineKeyboard } from "grammy";
import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { replyWithPhotoOrText, safeReply, replyTo, safeFetchJson } from "../core/helpers.js";

interface TmdbSearchResult {
  id: number;
  title: string;
  release_date?: string;
}

interface TmdbMovieDetails {
  id: number;
  title: string;
  overview: string;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  genres: { name: string }[];
  poster_path?: string;
  tagline?: string;
}

function movieCard(d: TmdbMovieDetails): { text: string; poster: string | null } {
  const year = d.release_date?.slice(0, 4) ?? "?";
  const runtime = d.runtime ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m` : "N/A";
  const overview = d.overview && d.overview.length > 500 ? d.overview.slice(0, 500).trim() + "…" : (d.overview || "No overview available.");

  const text = [
    `*${d.title}* (${year})`,
    d.tagline ? `_${d.tagline}_` : "",
    ``,
    overview,
    ``,
    `• Rating: ${d.vote_average ? d.vote_average.toFixed(1) + "/10" : "N/A"}`,
    `• Runtime: ${runtime}`,
    `• Genres: ${d.genres?.map(g => g.name).join(", ") || "N/A"}`,
    `• TMDB ID: ${d.id}`,
    `• [View on TMDB](https://www.themoviedb.org/movie/${d.id})`,
  ].filter(Boolean).join("\n");

  const poster = d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null;
  return { text, poster };
}

registerAddon({
  name: "tmdb",
  commands: [{ cmd: "tmdb", desc: "movie info (TMDB) 🎬 <title>" }],

  register(bot: Bot, env: Env) {
    function fetchMovie(id: number) {
      return safeFetchJson<TmdbMovieDetails>(`https://api.themoviedb.org/3/movie/${id}?api_key=${env.TMDB_API_KEY}`);
    }

    bot.command("tmdb", async (ctx) => {
      const query = ctx.match?.trim() ?? "";
      if (!query) { await ctx.reply("Usage: /tmdb <title>"); return; }
      if (!env.TMDB_API_KEY) { await ctx.reply("TMDB_API_KEY not configured."); return; }

      const sd = await safeFetchJson<{ results?: TmdbSearchResult[] }>(
        `https://api.themoviedb.org/3/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      );
      if (!sd) { await ctx.reply("Failed to reach TMDB, try again later."); return; }

      const results = sd.results?.slice(0, 5) ?? [];
      if (results.length === 0) { await ctx.reply(`"${query}" not found on TMDB.`); return; }

      // Single match -> skip the picker, go straight to the full card.
      if (results.length === 1) {
        const d = await fetchMovie(results[0].id);
        if (!d) { await ctx.reply("Failed to fetch movie details, try again later."); return; }
        const { text, poster } = movieCard(d);
        await replyWithPhotoOrText(ctx, poster, text);
        return;
      }

      // Multiple matches -> list top 5 (title, year, id, link) with number buttons to pick.
      const lines = results.map((r, i) => {
        const year = r.release_date?.slice(0, 4) ?? "?";
        return `${i + 1}. [${r.title} (${year})](https://www.themoviedb.org/movie/${r.id}) — id \`${r.id}\``;
      });
      const kb = new InlineKeyboard();
      results.forEach((r, i) => kb.text(`${i + 1}`, `tmdb:${r.id}`));

      await safeReply(ctx, [`Hasil buat *"${query}"*, pilih nomor:`, ``, ...lines].join("\n"), {
        reply_markup: kb,
        link_preview_options: { is_disabled: true },
        reply_parameters: replyTo(ctx),
      });
    });

    bot.callbackQuery(/^tmdb:(\d+)$/, async (ctx) => {
      const id = Number(ctx.match![1]);
      await ctx.answerCallbackQuery();
      await ctx.editMessageReplyMarkup().catch(() => {}); // strip the picker buttons on first tap, prevents spam-clicking
      const d = await fetchMovie(id);
      if (!d) { await ctx.reply("Failed to fetch movie details, try again later."); return; }
      const { text, poster } = movieCard(d);
      if (poster) await ctx.replyWithPhoto(poster, { caption: text, parse_mode: "Markdown" });
      else await safeReply(ctx, text);
    });
  },
});
