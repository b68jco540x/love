import { createImageAddon } from "../core/imageAddon.js";
import { safeFetchJson } from "../core/helpers.js";

createImageAddon({
  name: "dog",
  command: "dog",
  desc: "random dog 🐶",
  async fetch(env) {
    const d = await safeFetchJson<{ url: string }[]>("https://api.thedogapi.com/v1/images/search", {
      headers: env.DOG_API_KEY ? { "x-api-key": env.DOG_API_KEY } : {},
    });
    return d?.[0]?.url ?? null;
  },
});
