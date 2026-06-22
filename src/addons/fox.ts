import { createImageAddon } from "../core/imageAddon.js";
import { safeFetchJson } from "../core/helpers.js";

createImageAddon({
  name: "fox",
  command: "fox",
  desc: "random fox 🦊",
  async fetch() {
    const d = await safeFetchJson<{ image: string }>("https://randomfox.ca/floof/");
    return d?.image ?? null;
  },
});
