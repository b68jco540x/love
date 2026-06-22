import { createImageAddon } from "../core/imageAddon.js";
import { safeFetchJson } from "../core/helpers.js";

interface NekosBestResp {
  results?: { url: string }[];
}

// /waifu merges the former /neko + /waifu pools into one SFW command.
// The old upstream (api.waifu.pics) is dead, so we pull from nekos.best and
// pick a random category each call for variety. NSFW support is dropped for now.
const CATEGORIES = ["waifu", "neko"] as const;

createImageAddon({
  name: "waifu",
  command: "waifu",
  desc: "random waifu 🌸",
  async fetch() {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const d = await safeFetchJson<NekosBestResp>(`https://nekos.best/api/v2/${cat}`);
    return d?.results?.[0]?.url ?? null;
  },
});
