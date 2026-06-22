import { createImageAddon } from "../core/imageAddon.js";
import { safeFetchJson } from "../core/helpers.js";

createImageAddon({
  name: "duck",
  command: "duck",
  desc: "random duck 🦆",
  async fetch() {
    const d = await safeFetchJson<{ url: string }>("https://random-d.uk/api/v2/quack");
    return d?.url ?? null;
  },
});
