import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";

export interface Env {
  BOT_TOKEN: string;
  CAT_API_KEY?: string;
  DOG_API_KEY?: string;
  WEATHER_API_KEY?: string;
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
