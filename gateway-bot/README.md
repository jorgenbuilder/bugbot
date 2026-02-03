# Gateway Bot

Discord Gateway bot that listens for @mentions and forwards commands to Cloudflare Workers.

## Why?

Cloudflare Workers can't maintain WebSocket connections to Discord Gateway. This small Node.js service bridges that gap:
- Listens for @mentions via Discord Gateway
- Forwards commands to the existing Cloudflare consumer worker
- Keeps all the existing infrastructure (queues, workers, etc.)

## Setup

```bash
cd gateway-bot
npm install
```

## Run

```bash
node index.js
```

Or with environment variables:
```bash
DISCORD_BOT_TOKEN=xxx node index.js
```

## Deploy

Deploy this anywhere that can run Node.js 24/7:
- Railway.app (free tier)
- Fly.io (free tier)
- Your own server
- Docker container

Example Dockerfile:
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
CMD ["node", "index.js"]
```

## Development

```bash
npm run dev
```

This uses Node's `--watch` flag to auto-restart on changes.
