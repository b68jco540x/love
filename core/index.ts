import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Addon, Env } from "./types.ts";

const addons: Addon[] = [];

export function registerAddon(addon: Addon) {
  addons.push(addon);
}

export function getAddons(): Addon[] {
  return addons;
}

export function loadAddons(bot: Bot, env: Env) {
  for (const addon of addons) {
    addon.register(bot, env);
  }
}

export function generateHelp(): string {
  return addons
    .flatMap(a => a.commands)
    .map(c => `/${c.cmd} — ${c.desc}`)
    .join("\n");
}
