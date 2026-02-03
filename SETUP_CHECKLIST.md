# Setup Checklist

Use this checklist to deploy bugbot step by step.

## Pre-Deployment

- [ ] Cloudflare account created
- [ ] Node.js 20+ installed
- [ ] Docker installed (for container build)
- [ ] Git CLI installed
- [ ] Wrangler CLI installed (`npm install -g wrangler`)

## API Keys & Tokens

### Discord
- [ ] Application created at https://discord.com/developers/applications
- [ ] Bot user created
- [ ] Message Content Intent enabled
- [ ] Bot token copied
- [ ] Public key copied
- [ ] Bot added to server

### Linear
- [ ] Linear workspace accessible
- [ ] Personal API key created (Settings → API)
- [ ] API key copied

### PostHog
- [ ] PostHog project accessible
- [ ] Personal API key created (Project Settings → Personal API Keys)
- [ ] API key copied
- [ ] Project ID copied (from URL)

### GitHub
- [ ] Personal access token created (Settings → Developer settings → Tokens)
- [ ] Token has `repo` scope
- [ ] Token copied

### Cloudflare
- [ ] Account ID copied (from dashboard)
- [ ] API token created (My Profile → API Tokens)
- [ ] Token has Workers + Containers permissions
- [ ] Token copied

## Infrastructure Setup

- [ ] Run `npm install`
- [ ] Run `npm run setup`
- [ ] KV namespace IDs copied
- [ ] KV IDs updated in `gateway/wrangler.toml`
- [ ] KV IDs updated in `consumer/wrangler.toml`
- [ ] Queues created successfully

## Secrets Configuration

### Gateway Worker
- [ ] `DISCORD_PUBLIC_KEY` set
- [ ] `DISCORD_BOT_TOKEN` set
- [ ] Verified with `npx wrangler secret list --config gateway/wrangler.toml`

### Consumer Worker
- [ ] `LINEAR_API_KEY` set
- [ ] `POSTHOG_API_KEY` set
- [ ] `POSTHOG_PROJECT_ID` set
- [ ] `GITHUB_TOKEN` set
- [ ] `DISCORD_BOT_TOKEN` set
- [ ] `CLOUDFLARE_ACCOUNT_ID` set
- [ ] `CLOUDFLARE_API_TOKEN` set
- [ ] Verified with `npx wrangler secret list --config consumer/wrangler.toml`

## Container Deployment (Optional - for `fix` command)

- [ ] Container built with `npm run build:container`
- [ ] Container tagged for registry
- [ ] Container pushed to registry
- [ ] Container deployed to Cloudflare Containers
- [ ] Container name updated in `consumer/wrangler.toml` (if not default)

## Worker Deployment

- [ ] Gateway deployed with `npm run deploy:gateway`
- [ ] Consumer deployed with `npm run deploy:consumer`
- [ ] Gateway URL copied

## Discord Configuration

- [ ] Interactions Endpoint URL set in Discord Developer Portal
- [ ] Discord verified the endpoint (green checkmark)

## Testing

### Basic Test
- [ ] Sent `@bugbot contextualize test message` in Discord
- [ ] Received "Working on your request..." response
- [ ] Received success/error message within 30 seconds
- [ ] Linear issue created/updated

### Context Test
- [ ] Sent message with user email
- [ ] PostHog recordings found (if user exists)
- [ ] Context added to Linear issue

### Fix Test (if container deployed)
- [ ] Sent `@bugbot fix` with Linear + GitHub links
- [ ] Branch created
- [ ] PR created
- [ ] Linear updated with PR link

## Monitoring Setup

- [ ] Can view gateway logs: `npm run logs:gateway`
- [ ] Can view consumer logs: `npm run logs:consumer`
- [ ] Can check queue status: `npx wrangler queues list`
- [ ] Cloudflare dashboard accessible

## Documentation Review

- [ ] Read README.md
- [ ] Read QUICKSTART.md
- [ ] Read DEPLOYMENT.md
- [ ] Read SECRETS.md
- [ ] Read ARCHITECTURE.md

## Security Checklist

- [ ] All secrets set via Wrangler (not in code)
- [ ] No secrets committed to git
- [ ] API tokens have minimal required permissions
- [ ] Token rotation schedule planned (90 days)
- [ ] Emergency response plan documented

## Production Readiness

- [ ] Tested in staging Discord server
- [ ] Error handling verified
- [ ] Rate limits reviewed
- [ ] Cost estimate calculated
- [ ] Backup strategy documented
- [ ] Rollback procedure tested

## Post-Deployment

- [ ] Gateway URL documented
- [ ] All secrets stored securely (password manager)
- [ ] Team members informed
- [ ] Documentation shared
- [ ] Monitoring alerts configured

## Troubleshooting Reference

If issues occur, check:
1. Worker logs first
2. Secret values with `npx wrangler secret list`
3. Queue status with `npx wrangler queues list`
4. Service status pages (Discord, Linear, GitHub, PostHog, Cloudflare)
5. DEPLOYMENT.md troubleshooting section

## Support

- Documentation: See README.md, DEPLOYMENT.md, SECRETS.md
- Logs: `npm run logs:gateway` or `npm run logs:consumer`
- Issues: https://github.com/jorgenbuilder/bugbot/issues
