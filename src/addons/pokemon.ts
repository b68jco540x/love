import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { safeReply, safeFetchJson } from "../core/helpers.js";

interface PokemonResp {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: { front_default?: string; other?: { "official-artwork"?: { front_default?: string } } };
  types: { type: { name: string } }[];
  abilities: { ability: { name: string } }[];
  stats: { stat: { name: string }; base_stat: number }[];
}

registerAddon({
  name: "pokemon",
  commands: [{ cmd: "pokemon", desc: "pokemon info 🎮 <name/id>" }],

  register(bot: Bot, _env: Env) {
    bot.command("pokemon", async (ctx) => {
      const query = ctx.match?.trim().toLowerCase() ?? "";
      if (!query) { await ctx.reply("Usage: /pokemon <name or id>"); return; }
      const p = await safeFetchJson<PokemonResp>(`https://pokeapi.co/api/v2/pokemon/${query}`);
      if (!p) { await ctx.reply(`Pokemon "${query}" not found.`); return; }
      const sprite = p.sprites?.other?.["official-artwork"]?.front_default ?? p.sprites?.front_default;
      const caption = [
        `*#${p.id} ${p.name.charAt(0).toUpperCase() + p.name.slice(1)}*`, ``,
        `• Type: ${p.types.map(t => t.type.name).join(", ")}`,
        `• Height: ${p.height / 10}m`,
        `• Weight: ${p.weight / 10}kg`,
        `• Abilities: ${p.abilities.map(a => a.ability.name).join(", ")}`,
        `• Stats: ${p.stats.map(s => `${s.stat.name}: ${s.base_stat}`).join(" | ")}`,
      ].join("\n");
      if (sprite) await ctx.replyWithPhoto(sprite, { caption, parse_mode: "Markdown", reply_parameters: { message_id: ctx.message!.message_id } });
      else await safeReply(ctx, caption, { reply_parameters: { message_id: ctx.message!.message_id } });
    });
  },
});
