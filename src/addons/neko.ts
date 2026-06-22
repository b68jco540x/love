import { createImageAddon } from "../core/imageAddon.js";
import { safeFetchJson } from "../core/helpers.js";

createImageAddon({
  name: "neko",
  command: "neko",
  desc: "random neko 🐾",
  async fetch() {
    const d = await safeFetchJson<{ url: string }>("https://api.waifu.pics/sfw/neko");
    return d?.url ?? null;
  },
});
