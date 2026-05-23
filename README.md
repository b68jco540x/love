# Love Bot

A modular Telegram bot built with [grammY](https://grammy.dev/) and [Deno](https://deno.land/), optimized for Cloudflare Workers using [Denoflare](https://denoflare.dev/).

Features are highly modular: each command lives in its own file inside the `addons/` directory.

##  Setup & Deployment

### 1. Prerequisites
Make sure you have installed:
- [Deno](https://deno.land/)
- [Denoflare](https://denoflare.dev/)

### 2. Configure Environment Secrets
Add the following secrets to your Cloudflare Worker:
- `BOT_TOKEN`: Your Telegram bot token (**Required**)
- `WEATHER_API_KEY`: OpenWeatherMap API key (Required for `/weather`)
- `CAT_API_KEY`: thecatapi.com key *(Optional)*
- `DOG_API_KEY`: thedogapi.com key *(Optional)*

### 3. Deploy to Cloudflare
Make sure your `.denoflare` configuration is correct, then run:

`bash
denoflare push love --profile main
`

### 4. Set the Webhook
Register your Cloudflare Worker URL to Telegram by opening this link in your browser:

`text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://love.<your-subdomain>.workers.dev/
`

---

##  Managing Addons

Adding or removing a command is incredibly simple. All registered commands will automatically show up when users type `/help`.

### Creating a New Addon

1. Create a new file in `addons/` (e.g., `myaddon.ts`):

`ts
import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerAddon } from "../core/index.ts";

registerAddon({
  name: "myaddon", 
  commands: [{ cmd: "mycommand", desc: "Replies with a friendly greeting" }], 

  register(bot: Bot, env: Env) {
    bot.command("mycommand", async (ctx) => {
      await ctx.reply("Hello from my addon!");
    });
  },
});
`

2. Import your new file in `bot.ts`:

`ts
import "./addons/myaddon.ts";
`

### Removing an Addon

1. Delete the file from the `addons/` folder.
2. Remove the `import` statement from `bot.ts`.
3. Push the updates via Denoflare.

##  License

[MIT License](https://github.com/b68jco540x/love/blob/main/LICENSE)
