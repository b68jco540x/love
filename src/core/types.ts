import type { Bot } from "grammy";

export interface Env {
  BOT_TOKEN: string;
  CAT_API_KEY?: string;
  DOG_API_KEY?: string;
  WEATHER_API_KEY?: string;
  QUOTE_CHANNEL_ID?: string;
  QUOTE_MESSAGE_ID?: string;
  TMDB_API_KEY?: string;
  WYZIE_API_KEY?: string;
  WAIFU_API_KEY?: string;
}

export interface Command {
  cmd: string;
  desc: string;
}

export interface Addon {
  name: string;
  commands: Command[];
  register(bot: Bot, env: Env): void;
}
