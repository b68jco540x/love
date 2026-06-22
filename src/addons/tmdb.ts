import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { safeReply, safeFetchJson } from "../core/helpers.js";

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

registerAddon({
  name: "tmdb",
  commands: [{ cmd: "tmdb", desc: "movie info (TMDB) 🎬 <title>" }],

  register(bot: Bot, env: Env) {
    bot.command("tmdb", async (ctx) => {
      const query = ctx.match?.trim() ?? "";
      if (!query) { await ctx.reply("Usage: /tmdb <title>"); return; }
      if (!env.TMDB_API_KEY) { await ctx.reply("TMDB_API_KEY not configured."); return; }

      const sd = await safeFetchJson<{ results?: TmdbSearchResult[] }>(
        `https://api.themoviedb.org/3/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      );
      if (!sd) { await ctx.reply("Failed to reach TMDB, try again later."); return; }
      const found = sd.results?.[0];
      if (!found) { await ctx.reply(`"${query}" not found on TMDB.`); return; }

      const d = await safeFetchJson<TmdbMovieDetails>(`https://api.themoviedb.org/3/movie/${found.id}?api_key=${env.TMDB_API_KEY}`);
      if (!d) { await ctx.reply("Failed to fetch movie details, try again later."); return; }

      const year = d.release_date?.slice(0, 4) ?? "?";
      const runtime = d.runtime ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m` : "N/A";
      const overview = d.overview && d.overview.length > 500 ? d.overview.slice(0, 500).trim() + "…" : (d.overview || "No overview available.");

      const lines = [
        `*${d.title}* (${year})`,
        d.tagline ? `_${d.tagline}_` : "",
        ``,
        overview,
        ``,
        `• Rating: ${d.vote_average ? d.vote_average.toFixed(1) + "/10" : "N/A"}`,
        `• Runtime: ${runtime}`,
        `• Genres: ${d.genres?.map(g => g.name).join(", ") || "N/A"}`,
      ].filter(Boolean).join("\n");

      const poster = d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null;
      if (poster) await ctx.replyWithPhoto(poster, { caption: lines, parse_mode: "Markdown", reply_parameters: { message_id: ctx.message!.message_id } });
      else await safeReply(ctx, lines, { reply_parameters: { message_id: ctx.message!.message_id } });
    });
  },
});
