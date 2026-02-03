# Deployment Guide

This guide walks you through deploying bugbot to Cloudflare Workers.

## Prerequisites

- [ ] Cloudflare account with Workers enabled
- [ ] Node.js 20+ installed
- [ ] Discord bot created (see Discord Setup below)
- [ ] Linear workspace with API access
- [ ] PostHog account with API access
- [ ] GitHub account with personal access token
- [ ] Docker installed (for container build)

## Step 1: Discord Bot Setup

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "bugbot" and create
4. Go to "Bot" section:
   - Click "Add Bot"
   - Copy the bot token (save for later)
   - Enable "Message Content Intent"
5. Go to "OAuth2" → "URL Generator":
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Send Messages`, `Read Message History`
   - Copy the generated URL and use it to add the bot to your server
6. Copy the "Public Key" from the "General Information" section

## Step 2: Get API Keys

### Linear
1. Go to Linear Settings → API
2. Create a Personal API Key
3. Copy the key

### PostHog
1. Go to PostHog Project Settings
2. Go to Personal API Keys
3. Create a new key
4. Copy the key and project ID (from URL: app.posthog.com/project/YOUR_PROJECT_ID)

### GitHub
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a new token (classic)
3. Select scope: `repo` (full control)
4. Copy the token

### Cloudflare
1. Go to Cloudflare Dashboard
2. Copy your Account ID (visible in dashboard URL or account homepage)
3. Go to "My Profile" → "API Tokens"
4. Create a new token with these permissions:
   - Account.Cloudflare Workers: Edit
   - Account.Cloudflare Containers: Edit
5. Copy the token

## Step 3: Initial Setup

Run the setup script:

```bash
npm run setup
```

This will:
- Install all dependencies
- Create KV namespaces
- Create queues
- Output KV namespace IDs

## Step 4: Configure Wrangler

Update `gateway/wrangler.toml` and `consumer/wrangler.toml` with the KV namespace IDs from Step 3.

Find these lines and replace with your IDs:
```toml
[[kv_namespaces]]
binding = "BUGBOT_KV"
id = "YOUR_KV_NAMESPACE_ID"  # <- Replace this
preview_id = "YOUR_KV_PREVIEW_ID"  # <- Replace this
```

## Step 5: Set Secrets

Run the secrets setup script:

```bash
npm run setup:secrets
```

This will prompt you for all required secrets:

**Gateway Worker:**
- Discord Public Key (from Step 1)
- Discord Bot Token (from Step 1)

**Consumer Worker:**
- Linear API Key (from Step 2)
- PostHog API Key (from Step 2)
- PostHog Project ID (from Step 2)
- GitHub Token (from Step 2)
- Discord Bot Token (same as gateway)
- Cloudflare Account ID (from Step 2)
- Cloudflare API Token (from Step 2)

## Step 6: Deploy Container

### Build the container:

```bash
npm run build:container
```

### Tag and push to a registry:

For Google Container Registry:
```bash
docker tag bugbot-executor gcr.io/YOUR_PROJECT/bugbot-executor:latest
docker push gcr.io/YOUR_PROJECT/bugbot-executor:latest
```

For Docker Hub:
```bash
docker tag bugbot-executor YOUR_USERNAME/bugbot-executor:latest
docker push YOUR_USERNAME/bugbot-executor:latest
```

### Deploy to Cloudflare Containers:

```bash
curl -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/containers" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "bugbot-executor",
    "image": "gcr.io/YOUR_PROJECT/bugbot-executor:latest"
  }'
```

**Note:** Cloudflare Containers is in beta. Check the [Cloudflare documentation](https://developers.cloudflare.com/workers/containers/) for the latest deployment instructions.

## Step 7: Deploy Workers

Deploy both workers:

```bash
npm run deploy:all
```

Copy the gateway worker URL from the output. It will look like:
```
https://bugbot-gateway.YOUR_SUBDOMAIN.workers.dev
```

## Step 8: Configure Discord Interactions Endpoint

1. Go back to Discord Developer Portal
2. Go to your application → "General Information"
3. Set "Interactions Endpoint URL" to: `https://bugbot-gateway.YOUR_SUBDOMAIN.workers.dev`
4. Save changes

Discord will verify the endpoint. If verification fails:
- Check that gateway worker is deployed
- Check that `DISCORD_PUBLIC_KEY` secret is set correctly
- Check worker logs: `npm run logs:gateway`

## Step 9: Test the Bot

In your Discord server:

1. Test contextualize command:
```
@bugbot contextualize
Login button not working for user@example.com
```

2. Test fix command (after contextualize creates an issue):
```
@bugbot fix
https://linear.app/your-workspace/issue/PROJ-123
https://github.com/yourorg/yourrepo
```

## Monitoring

### View logs:

Gateway worker:
```bash
npm run logs:gateway
```

Consumer worker:
```bash
npm run logs:consumer
```

### Check queue:

```bash
npx wrangler queues list
npx wrangler queues consumer get bugbot-commands
```

### Check KV data:

```bash
npx wrangler kv:key list --binding=BUGBOT_KV --config gateway/wrangler.toml
```

## Troubleshooting

### Discord not receiving responses
- Verify Interactions Endpoint URL is set correctly
- Check gateway logs: `npm run logs:gateway`
- Test endpoint manually: `curl https://YOUR_GATEWAY_URL`

### Commands not processing
- Check consumer logs: `npm run logs:consumer`
- Check queue status: `npx wrangler queues list`
- Verify all secrets are set correctly

### Container execution failing
- Verify container is deployed to Cloudflare Containers
- Check `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`
- Test container locally: `docker run -it bugbot-executor bash`

### Linear API errors
- Verify Linear API key is valid
- Check Linear team permissions
- Test API key with curl:
  ```bash
  curl -H "Authorization: YOUR_LINEAR_KEY" https://api.linear.app/graphql
  ```

### PostHog API errors
- Verify PostHog API key is valid
- Check project ID is correct
- Test API key with curl:
  ```bash
  curl -H "Authorization: Bearer YOUR_POSTHOG_KEY" \
    https://app.posthog.com/api/projects/YOUR_PROJECT_ID/
  ```

## Updating

To update the deployment:

1. Make your changes
2. Commit to git
3. Redeploy:
   ```bash
   npm run deploy:all
   ```

For container updates:
```bash
npm run build:container
docker push YOUR_IMAGE
# Redeploy container to Cloudflare Containers
```

## Rollback

If something goes wrong:

1. View deployment history:
   ```bash
   npx wrangler deployments list --config gateway/wrangler.toml
   npx wrangler deployments list --config consumer/wrangler.toml
   ```

2. Rollback to a previous deployment:
   ```bash
   npx wrangler rollback --config gateway/wrangler.toml
   npx wrangler rollback --config consumer/wrangler.toml
   ```

## Production Checklist

Before going to production:

- [ ] All secrets are set
- [ ] KV namespaces are created and configured
- [ ] Queues are created
- [ ] Container is deployed and tested
- [ ] Workers are deployed
- [ ] Discord Interactions Endpoint is configured
- [ ] Bot is added to Discord server
- [ ] Test commands work end-to-end
- [ ] Monitoring is set up
- [ ] Error handling is tested
- [ ] Rate limits are configured (if needed)
- [ ] Backup strategy is in place

## Cost Estimate

Cloudflare Workers pricing (as of 2024):

- Free tier: 100,000 requests/day
- Paid plan: $5/month for 10 million requests
- KV: $0.50 per million reads, $5 per million writes
- Queues: $0.40 per million operations
- Containers: Pricing varies (check Cloudflare docs)

For typical usage (< 1000 commands/day), expect to stay within the free tier or pay < $10/month.

## Support

For issues:
1. Check logs first
2. Review troubleshooting section
3. Check Cloudflare status page
4. Review API provider status (Discord, Linear, PostHog, GitHub)
