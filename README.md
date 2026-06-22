# Love Bot

A modular Telegram bot built with [grammY](https://grammy.dev/) and **npm/TypeScript**, optimized for Cloudflare Workers using [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

Features are highly modular: each command lives in its own file inside the `src/addons/` directory.

## 🚀 Setup & Deployment

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

```bash
npm install -g wrangler
wrangler login
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Secrets
Secrets are already configured in your Cloudflare Worker dashboard from the previous Denoflare deployment. They will continue to work automatically.

If you need to set or update them via CLI:
```bash
wrangler secret put BOT_TOKEN
wrangler secret put WEATHER_API_KEY
wrangler secret put CAT_API_KEY
wrangler secret put DOG_API_KEY
```

### 4. Deploy to Cloudflare
```bash
npm run deploy
```

Or manually:
```bash
wrangler deploy
```

### 5. Webhook (One-time setup)
If your Worker URL changed, set the webhook:
```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://love.<your-subdomain>.workers.dev/
```

---

## 📦 Managing Addons

Adding or removing a command is incredibly simple. All registered commands will automatically show up when users type `/help`.

### Creating a New Addon

1. Create a new file in `src/addons/` (e.g., `myaddon.ts`):

```ts
import type { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerAddon } from "../core/index.js";

registerAddon({
  name: "myaddon",
  commands: [{ cmd: "mycommand", desc: "Replies with a friendly greeting" }],

  register(bot: Bot, env: Env) {
    bot.command("mycommand", async (ctx) => {
      await ctx.reply("Hello from my addon!");
    });
  },
});
```

2. Import your new file in `src/bot.ts`:

```ts
import "./addons/myaddon.js";
```

3. Deploy:

```bash
npm run deploy
```

### Removing an Addon

1. Delete the file from the `src/addons/` folder.
2. Remove the `import` statement from `src/bot.ts`.
3. Deploy via `npm run deploy`.

---

## 🛠️ Development

Run locally with hot reload:

```bash
npm run dev
```

View live logs:

```bash
npm run tail
```

---

## 📄 License

[MIT License](LICENSE)
