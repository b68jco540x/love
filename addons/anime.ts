import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerAddon } from "../core/index.ts";
import { safeReply } from "../core/helpers.ts";

registerAddon({
  name: "anime",
  commands: [{ cmd: "kitsu", desc: "anime info (Kitsu) <title>" }, { cmd: "anilist", desc: "anime info (AniList) <title>" }, { cmd: "mal", desc: "anime info (MAL) <title>" }],

  register(bot: Bot, _env: Env) {
    bot.command("kitsu", async (ctx) => {
      const query = ctx.match?.trim() ?? "";
      if (!query) { await ctx.reply("Usage: /kitsu <title>"); return; }
      const d = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=1`, {
        headers: { "Accept": "application/vnd.api+json" },
      }).then(r => r.json());
      if (!d.data?.length) { await ctx.reply(`Not found: "${query}"`); return; }
      const a = d.data[0].attributes;
      const cover = a.posterImage?.large ?? a.posterImage?.medium;
      const lines = [
        `*${a.canonicalTitle}*`,
        a.titles?.ja_jp ? `(${a.titles.ja_jp})` : "",
        ``,
        `• Score: ${a.averageRating ? (a.averageRating / 10).toFixed(1) + "/10" : "N/A"}`,
        `• Episodes: ${a.episodeCount ?? "?"}`,
        `• Status: ${a.status ?? "N/A"}`,
        `• Type: ${a.subtype ?? "N/A"}`,
        `• Aired: ${a.startDate ?? "?"} → ${a.endDate ?? "ongoing"}`,
      ].filter(Boolean).join("\n");
      if (cover) await ctx.replyWithPhoto(cover, { caption: lines, parse_mode: "Markdown", reply_parameters: { message_id: ctx.message!.message_id } });
      else await safeReply(ctx, lines, { reply_parameters: { message_id: ctx.message!.message_id } });
    });

    bot.command("anilist", async (ctx) => {
      const query = ctx.match?.trim() ?? "";
      if (!query) { await ctx.reply("Usage: /anilist <title>"); return; }
      const gql = `query ($search: String) { Media(search: $search, type: ANIME) { title { romaji native } coverImage { extraLarge } averageScore episodes status startDate { year month day } endDate { year month day } format genres } }`;
      const json = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: gql, variables: { search: query } }),
      }).then(r => r.json());
      const a = json.data?.Media;
      if (!a) { await ctx.reply(`Not found: "${query}"`); return; }
      const fmt = (d: { year?: number; month?: number; day?: number }) =>
        d?.year ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : "?";
      const lines = [
        `*${a.title.romaji}*`,
        a.title.native ? `(${a.title.native})` : "",
        ``,
        `• Score: ${a.averageScore ? a.averageScore + "/100" : "N/A"}`,
        `• Episodes: ${a.episodes ?? "?"}`,
        `• Status: ${a.status ?? "N/A"}`,
        `• Format: ${a.format ?? "N/A"}`,
        `• Aired: ${fmt(a.startDate)} → ${a.endDate?.year ? fmt(a.endDate) : "ongoing"}`,
        `• Genres: ${a.genres?.join(", ") ?? "N/A"}`,
      ].filter(Boolean).join("\n");
      if (a.coverImage?.extraLarge) await ctx.replyWithPhoto(a.coverImage.extraLarge, { caption: lines, parse_mode: "Markdown", reply_parameters: { message_id: ctx.message!.message_id } });
      else await safeReply(ctx, lines, { reply_parameters: { message_id: ctx.message!.message_id } });
    });

    bot.command("mal", async (ctx) => {
      const query = ctx.match?.trim() ?? "";
      if (!query) { await ctx.reply("Usage: /mal <title>"); return; }
      const d = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`).then(r => r.json());
      if (!d.data?.length) { await ctx.reply(`Not found: "${query}"`); return; }
      const a = d.data[0];
      const lines = [
        `*${a.title}*`,
        a.title_japanese ? `(${a.title_japanese})` : "",
        ``,
        `• Score: ${a.score ? a.score + "/10" : "N/A"}`,
        `• Episodes: ${a.episodes ?? "?"}`,
        `• Status: ${a.status ?? "N/A"}`,
        `• Type: ${a.type ?? "N/A"}`,
        `• Aired: ${a.aired?.string ?? "N/A"}`,
        `• Genres: ${a.genres?.map((g: { name: string }) => g.name).join(", ") ?? "N/A"}`,
        `• Studios: ${a.studios?.map((s: { name: string }) => s.name).join(", ") ?? "N/A"}`,
      ].filter(Boolean).join("\n");
      if (a.images?.jpg?.large_image_url) await ctx.replyWithPhoto(a.images.jpg.large_image_url, { caption: lines, parse_mode: "Markdown", reply_parameters: { message_id: ctx.message!.message_id } });
      else await safeReply(ctx, lines, { reply_parameters: { message_id: ctx.message!.message_id } });
    });
  },
});
