# Bugbot 🤖

Discord bot for automated bug triaging and fixing with Linear, PostHog, and GitHub integration.

## Architecture

- **Gateway Worker** (`gateway/`): Receives Discord events, parses commands, enqueues jobs
- **Consumer Worker** (`consumer/`): Processes queued commands asynchronously
- **Container Executor** (`container/`): Runs Claude Code for automated fixes
- **Shared** (`shared/`): Common types and utilities

## Commands

### `@bugbot contextualize`

Creates or updates a Linear issue with context from Discord and PostHog recordings.

**Features:**
- Automatically creates Linear issue if not found
- Searches PostHog for relevant user recordings
- Maps Discord threads to Linear issues (via KV)
- Posts context packet comment to Linear

**Usage:**
```
@bugbot contextualize
Issue with login button not working for user@example.com
https://linear.app/workspace/issue/PROJ-123
```

### `@bugbot fix`

Automatically generates a fix PR for a Linear issue.

**Features:**
- Searches GitHub for relevant frontend files
- Executes Claude Code in sandboxed container
- Creates branch, commits changes, and opens PR
- Updates Linear issue and Discord with PR link
- Triggers Vercel preview deployment

**Usage:**
```
@bugbot fix
https://linear.app/workspace/issue/PROJ-123
https://github.com/yourorg/yourrepo
```

## Setup

### Prerequisites

- Node.js 20+
- Cloudflare account with Workers enabled
- Discord bot token
- Linear API key
- PostHog API key
- GitHub personal access token

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create KV namespaces:
```bash
npx wrangler kv:namespace create "BUGBOT_KV"
npx wrangler kv:namespace create "BUGBOT_KV" --preview
```

Update the namespace IDs in `gateway/wrangler.toml` and `consumer/wrangler.toml`.

3. Create queue:
```bash
npx wrangler queues create bugbot-commands
npx wrangler queues create bugbot-commands-dlq
```

4. Set secrets:
```bash
# Gateway secrets
npx wrangler secret put DISCORD_PUBLIC_KEY --config gateway/wrangler.toml
npx wrangler secret put DISCORD_BOT_TOKEN --config gateway/wrangler.toml

# Consumer secrets
npx wrangler secret put LINEAR_API_KEY --config consumer/wrangler.toml
npx wrangler secret put POSTHOG_API_KEY --config consumer/wrangler.toml
npx wrangler secret put POSTHOG_PROJECT_ID --config consumer/wrangler.toml
npx wrangler secret put GITHUB_TOKEN --config consumer/wrangler.toml
npx wrangler secret put DISCORD_BOT_TOKEN --config consumer/wrangler.toml
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --config consumer/wrangler.toml
npx wrangler secret put CLOUDFLARE_API_TOKEN --config consumer/wrangler.toml
```

5. Build and deploy container:
```bash
cd container
docker build -t bugbot-executor .
# Push to your container registry and deploy to Cloudflare Containers
# See container/README.md for details
```

6. Deploy workers:
```bash
npm run deploy:all
```

### Discord Bot Setup

1. Create a Discord application at https://discord.com/developers/applications
2. Create a bot user and copy the token
3. Enable "Message Content Intent" in Bot settings
4. Generate an invite URL with these permissions:
   - Send Messages
   - Read Message History
   - Use Slash Commands
5. Add the bot to your server
6. Set the Interactions Endpoint URL to your gateway worker URL

## Required Secrets

### Gateway Worker
- `DISCORD_PUBLIC_KEY`: Discord application public key (from Discord Developer Portal)
- `DISCORD_BOT_TOKEN`: Discord bot token

### Consumer Worker
- `LINEAR_API_KEY`: Linear API key (Settings → API → Personal API Keys)
- `POSTHOG_API_KEY`: PostHog personal API key (Project Settings → Personal API Keys)
- `POSTHOG_PROJECT_ID`: PostHog project ID (from URL: app.posthog.com/project/YOUR_ID)
- `GITHUB_TOKEN`: GitHub personal access token with `repo` scope
- `DISCORD_BOT_TOKEN`: Discord bot token (same as gateway)
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers and Containers permissions

### Container Runtime
- `GITHUB_TOKEN`: Passed from consumer at runtime
- `LINEAR_API_KEY`: Passed from consumer at runtime

## Development

Run gateway locally:
```bash
npm run dev:gateway
```

Run consumer locally:
```bash
npm run dev:consumer
```

## Deployment

Deploy both workers:
```bash
npm run deploy:all
```

Deploy individually:
```bash
npm run deploy:gateway
npm run deploy:consumer
```

## Project Structure

```
bugbot/
├── gateway/          # Discord ingress Worker
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   └── wrangler.toml
├── consumer/         # Queue consumer Worker
│   ├── src/
│   │   ├── index.ts
│   │   ├── commands/
│   │   │   ├── contextualize.ts
│   │   │   └── fix.ts
│   │   └── clients/
│   │       ├── linear.ts
│   │       ├── posthog.ts
│   │       └── github.ts
│   ├── package.json
│   └── wrangler.toml
├── container/        # Claude Code executor
│   ├── Dockerfile
│   ├── execute.sh
│   └── README.md
├── shared/           # Shared types and utilities
│   ├── src/
│   │   ├── types.ts
│   │   ├── extractors.ts
│   │   └── index.ts
│   └── package.json
├── package.json
└── README.md
```

## Troubleshooting

### Gateway not receiving Discord events
- Verify Interactions Endpoint URL is set correctly
- Check Discord signature verification
- Ensure `DISCORD_PUBLIC_KEY` secret is set

### Consumer not processing commands
- Check queue is created and bound correctly
- Verify all secrets are set
- Check Cloudflare Workers logs: `npx wrangler tail --config consumer/wrangler.toml`

### Container execution failing
- Verify container is deployed to Cloudflare Containers
- Check `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`
- Test container locally with Docker

### Linear API errors
- Verify `LINEAR_API_KEY` is valid
- Check Linear team ID is accessible
- Ensure bot has permissions to create issues and comments

### GitHub PR creation fails
- Verify `GITHUB_TOKEN` has `repo` scope
- Check repository URL is correct
- Ensure bot has write access to repository

## License

MIT
