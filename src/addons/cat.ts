import { createImageAddon } from "../core/imageAddon.js";
import { safeFetchJson } from "../core/helpers.js";

createImageAddon({
  name: "cat",
  command: "cat",
  desc: "random cat 🐱",
  async fetch(env) {
    const d = await safeFetchJson<{ url: string }[]>("https://api.thecatapi.com/v1/images/search", {
      headers: env.CAT_API_KEY ? { "x-api-key": env.CAT_API_KEY } : {},
    });
    return d?.[0]?.url ?? null;
  },
});
