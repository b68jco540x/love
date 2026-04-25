# Vibe-Coded bot

A modular Telegram bot built with [grammY](https://grammy.dev/) and [Deno](https://deno.land/), deployed to Cloudflare Workers via [Denoflare](https://denoflare.dev/).

Each feature lives in its own file inside `addons/`. Adding or removing a command is as simple as adding or deleting a file.

## Setup

### 1. Install prerequisites

- [Deno](https://deno.land/)
- [Denoflare](https://denoflare.dev/)

### 2. Clone the repo

```bash
git clone https://github.com/love/love
cd love
```

### 3. Configure `.denoflare`

```json
{
  "$schema": "https://raw.githubusercontent.com/skymethod/denoflare/v0.7.0/common/config.schema.json",
  "scripts": {
    "fun-bot": {
      "path": "bot.ts",
      "localPort": 3031,
      "workersDev": true
    }
  },
  "profiles": {
    "main": {
      "accountId": "YOUR_CF_ACCOUNT_ID",
      "apiToken": "YOUR_CF_API_TOKEN"
    }
  }
}
```

### 4. Set Cloudflare Secrets

In your Worker Variables and Secrets:

| Secret | Description |
- `BOT_TOKEN` | Telegram bot token
- `CAT_API_KEY` | *(optional)* thecatapi.com key
- `DOG_API_KEY` | *(optional)* thedogapi.com key
- `WEATHER_API_KEY` | Required for `/weather` openweathermap.org

### 5. Deploy

```bash
denoflare push fun-bot --profile main
```

### 6. Set Webhook

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://love.<subdomain>.workers.dev/
```

---

## Creating an Addon

Every addon is a single `.ts` file in `addons/`. Here's the minimal template:

```ts
import type { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerAddon } from "../core/index.ts";

registerAddon({
  name: "myaddon",          // unique name
  commands: ["mycommand"],  // commands this addon exposes (for /help)

  register(bot: Bot, env: Env) {
    bot.command("mycommand", async (ctx) => {
      await ctx.reply("Hello from my addon!");
    });
  },
});
```

Then import it in `bot.ts`:

```ts
import "./addons/myaddon.ts";
```

That's it. `/mycommand` is now live. `/help` will also list it automatically.

## Removing an Addon

1. Delete the file from `addons/`
2. Remove its import from `bot.ts`
3. Push again

The command disappears from the bot and from `/help`.

## Addon with Refresh Button

Use helpers from `core/helpers.ts`:

```ts
import { refreshKb, editPhoto } from "../core/helpers.ts";

registerAddon({
  name: "example",
  commands: ["example"],

  register(bot: Bot, env: Env) {
    const fetchImage = async () => "https://example.com/image.jpg";

    bot.command("example", async (ctx) => {
      const url = await fetchImage();
      await ctx.replyWithPhoto(url, {
        reply_markup: refreshKb("example_refresh"),
        reply_parameters: { message_id: ctx.message!.message_id },
      });
    });

    bot.callbackQuery("example_refresh", async (ctx) => {
      const url = await fetchImage();
      await editPhoto(env.BOT_TOKEN, ctx.chat!.id, ctx.callbackQuery.message!.message_id, url, null, refreshKb("example_refresh"));
      await ctx.answerCallbackQuery();
    });
  },
});
```

## Core API Reference

### `core/types.ts`

```ts
interface Env {
  BOT_TOKEN: string;
  CAT_API_KEY?: string;
  DOG_API_KEY?: string;
  WEATHER_API_KEY?: string;
}

interface Addon {
  name: string;
  commands: string[];           // listed in /help
  register(bot: Bot, env: Env): void;
}
```

### `core/index.ts`

| Export | Description |
- `registerAddon(addon)` | Register an addon (call on import) |
- `getAddons()` | Get all registered addons |
- `loadAddons(bot, env)` | Register all addons into the bot instance |

### `core/helpers.ts`

| Export | Description |
- `refreshKb(cbData)` | Create InlineKeyboard with 🔄 Refresh button |
- `waifuKb(nsfw, url)` | Create keyboard with Refresh + Source buttons |
- `editPhoto(token, chatId, messageId, url, caption, kb)` | Edit an existing photo message |
- `safeReply(ctx, text, opts?)` | Reply with Markdown, fallback to plain text on error |

## License

[MIT](https://github.com/b68jco540x/love/blob/main/LICENSE)
