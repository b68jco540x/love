import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";
import { safeReply, safeFetchJson } from "../core/helpers.js";

interface WeatherResp {
  cod: number;
  name: string;
  sys: { country: string };
  weather: { description: string }[];
  main: { temp: number; feels_like: number; humidity: number };
  wind: { speed: number };
}

registerAddon({
  name: "weather",
  commands: [{ cmd: "weather", desc: "weather info 🌤 <city>" }],

  register(bot: Bot, env: Env) {
    bot.command("weather", async (ctx) => {
      const query = ctx.match?.trim() ?? "";
      if (!query) { await ctx.reply("Usage: /weather <city>"); return; }
      if (!env.WEATHER_API_KEY) { await ctx.reply("Weather API key not configured."); return; }
      const d = await safeFetchJson<WeatherResp>(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${env.WEATHER_API_KEY}&units=metric`
      );
      if (!d) { await ctx.reply("Failed to fetch weather, try again later."); return; }
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
