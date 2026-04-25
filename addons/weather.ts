import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerAddon } from "../core/index.ts";
import { safeReply } from "../core/helpers.ts";

registerAddon({
  name: "weather",
  commands: [{ cmd: "weather", desc: "weather info 🌤 <city>" }],

  register(bot: Bot, env: Env) {
    bot.command("weather", async (ctx) => {
      const query = ctx.match?.trim() ?? "";
      if (!query) { await ctx.reply("Usage: /weather <city>"); return; }
      if (!env.WEATHER_API_KEY) { await ctx.reply("Weather API key not configured."); return; }
      const d = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${env.WEATHER_API_KEY}&units=metric`
      ).then(r => r.json());
      if (d.cod !== 200) { await ctx.reply(`City "${query}" not found.`); return; }
      const w = d.weather[0];
      await safeReply(ctx, [
        `*${d.name}, ${d.sys.country}*`, ``,
        `• ${w.description.charAt(0).toUpperCase() + w.description.slice(1)}`,
        `• Temp: ${d.main.temp}°C (feels like ${d.main.feels_like}°C)`,
        `• Humidity: ${d.main.humidity}%`,
        `• Wind: ${d.wind.speed} m/s`,
      ].join("\n"), { reply_parameters: { message_id: ctx.message!.message_id } });
    });
  },
});
