import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { safeReply } from "../core/helpers.js";

interface TmdbResult {
  id: number;
  media_type: "movie" | "tv" | "person" | "collection";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
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

registerAddon({
  name: "subs",
  commands: [{ cmd: "subs", desc: "subtitle downloader 🎬 <title> [S01E01] [lang:id]" }],

  register(bot: Bot, env: Env) {
    bot.command("subs", async (ctx) => {
      const raw = ctx.match?.trim() ?? "";
      if (!raw) { await ctx.reply("Usage: /subs <title> [S01E01] [lang:id]"); return; }
      if (!env.TMDB_API_KEY || !env.WYZIE_API_KEY) {
        await ctx.reply("TMDB_API_KEY / WYZIE_API_KEY not configured."); return;
      }

      const { title, season, episode, language } = parseQuery(raw);
      if (!title) { await ctx.reply("Usage: /subs <title> [S01E01] [lang:id]"); return; }

      const tmdb = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(title)}`
      ).then(r => r.json() as Promise<{ results?: TmdbResult[] }>);

      const match = tmdb.results?.find(r => r.media_type === "movie" || r.media_type === "tv");
      if (!match) { await ctx.reply(`"${title}" not found on TMDB.`); return; }

      const isTv = match.media_type === "tv";
      const displayTitle = match.title ?? match.name ?? title;
      const year = (match.release_date ?? match.first_air_date)?.slice(0, 4) ?? "";
      const s = season ?? 1;
      const e = episode ?? 1;

      const params = new URLSearchParams({ id: String(match.id), key: env.WYZIE_API_KEY, language });
      if (isTv) { params.set("season", String(s)); params.set("episode", String(e)); }

      const subs = await fetch(`https://sub.wyzie.io/search?${params}`).then(r => r.json() as Promise<WyzieSub[]>);
      const tag = isTv ? ` S${String(s).padStart(2, "0")}E${String(e).padStart(2, "0")}` : "";

      if (!Array.isArray(subs) || subs.length === 0) {
        await ctx.reply(`No subtitles found for *${displayTitle}*${year ? ` (${year})` : ""}${tag}.`, { parse_mode: "Markdown" });
        return;
      }

      const lines = subs.slice(0, 8).map((sub, i) =>
        `${i + 1}. [${sub.display} — ${sub.source}](${sub.url}) \`.${sub.format}\``
      );

      await safeReply(ctx, [
        `*${displayTitle}*${year ? ` (${year})` : ""}${tag}`, ``,
        ...lines,
      ].join("\n"), {
        reply_parameters: { message_id: ctx.message!.message_id },
        link_preview_options: { is_disabled: true },
      });
    });
  },
});
