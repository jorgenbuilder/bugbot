# Quick Start Guide

Get bugbot running in 15 minutes.

## Prerequisites

- Cloudflare account (free tier OK)
- Discord bot token
- Linear, PostHog, GitHub API keys

## 1. Clone and Install

```bash
git clone https://github.com/jorgenbuilder/bugbot.git
cd bugbot
npm install
```

## 2. Setup Infrastructure

```bash
npm run setup
```

This creates KV namespaces and queues. Copy the KV namespace IDs from the output.

## 3. Configure Wrangler

Edit `gateway/wrangler.toml` and `consumer/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "BUGBOT_KV"
id = "paste_your_kv_id_here"
preview_id = "paste_your_preview_id_here"
```

## 4. Set Secrets

```bash
npm run setup:secrets
```

Follow the prompts to enter your API keys. You'll need:
- Discord Public Key and Bot Token
- Linear API Key
- PostHog API Key and Project ID
- GitHub Token
- Cloudflare Account ID and API Token

## 5. Deploy Workers

```bash
npm run deploy:all
```

Copy the gateway worker URL from the output.

## 6. Configure Discord

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Set "Interactions Endpoint URL" to your gateway worker URL
4. Save (Discord will verify the endpoint)

## 7. Build Container (Optional)

The `fix` command requires a container. If you only need `contextualize`, skip this step.

```bash
npm run build:container
docker tag bugbot-executor YOUR_REGISTRY/bugbot-executor:latest
docker push YOUR_REGISTRY/bugbot-executor:latest
```

Then deploy to Cloudflare Containers (see container/README.md).

## 8. Test

In Discord:

```
@bugbot contextualize
Login button not working for user@example.com
```

You should see:
1. Immediate "Working on your request..." message
2. A Linear issue created (or updated)
3. "✅ Added context to Linear issue" message

## 9. Monitor

View logs:
```bash
npm run logs:gateway
npm run logs:consumer
```

## Troubleshooting

### Discord verification fails
- Check `DISCORD_PUBLIC_KEY` is set correctly
- Ensure gateway worker is deployed
- Check logs: `npm run logs:gateway`

### Commands not processing
- Check consumer logs: `npm run logs:consumer`
- Verify all secrets are set: `npx wrangler secret list --config consumer/wrangler.toml`

### Linear/PostHog/GitHub errors
- Test API keys manually (see SECRETS.md)
- Check service status pages

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- Review [SECRETS.md](SECRETS.md) for security best practices

## Getting Help

- Check logs first
- Review error messages in Discord
- Search issues on GitHub
- Open a new issue if needed

## Cost

With typical usage (< 1000 commands/day):
- Cloudflare Workers: Free tier (100k requests/day)
- Total cost: $0-10/month

No credit card required for initial setup on free tier.
