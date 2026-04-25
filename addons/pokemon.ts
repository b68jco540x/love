import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerAddon } from "../core/index.ts";
import { safeReply } from "../core/helpers.ts";

registerAddon({
  name: "pokemon",
  commands: [{ cmd: "pokemon", desc: "pokemon info 🎮 <name/id>" }],

  register(bot: Bot, _env: Env) {
    bot.command("pokemon", async (ctx) => {
      const query = ctx.match?.trim().toLowerCase() ?? "";
      if (!query) { await ctx.reply("Usage: /pokemon <name or id>"); return; }
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
      if (!res.ok) { await ctx.reply(`Pokemon "${query}" not found.`); return; }
      const p = await res.json();
      const sprite = p.sprites?.other?.["official-artwork"]?.front_default ?? p.sprites?.front_default;
      const caption = [
        `*#${p.id} ${p.name.charAt(0).toUpperCase() + p.name.slice(1)}*`, ``,
        `• Type: ${p.types.map((t: { type: { name: string } }) => t.type.name).join(", ")}`,
        `• Height: ${p.height / 10}m`,
        `• Weight: ${p.weight / 10}kg`,
        `• Abilities: ${p.abilities.map((a: { ability: { name: string } }) => a.ability.name).join(", ")}`,
        `• Stats: ${p.stats.map((s: { stat: { name: string }; base_stat: number }) => `${s.stat.name}: ${s.base_stat}`).join(" | ")}`,
      ].join("\n");
      if (sprite) await ctx.replyWithPhoto(sprite, { caption, parse_mode: "Markdown", reply_parameters: { message_id: ctx.message!.message_id } });
      else await safeReply(ctx, caption, { reply_parameters: { message_id: ctx.message!.message_id } });
    });
  },
});
