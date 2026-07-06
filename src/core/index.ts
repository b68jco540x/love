import type { Bot } from "grammy";
import type { Addon, Env } from "./types.js";

const addons: Addon[] = [];

export function registerAddon(addon: Addon) {
  addons.push(addon);
}

export function getAddons(): Addon[] {
  return addons;
}

export function loadAddons(bot: Bot, env: Env, execCtx?: ExecutionContext) {
  for (const addon of addons) {
    addon.register(bot, env, execCtx);
  }
}

export function generateHelp(): string {
  return addons
    .flatMap(a => a.commands)
    .map(c => `/${c.cmd} — ${c.desc}`)
    .join("\n");
}

export function generateBotCommands(): { command: string; description: string }[] {
  return addons.flatMap(a => a.commands).map(c => ({ command: c.cmd, description: c.desc }));
}
