# Required Secrets

This document lists all secrets required for bugbot deployment.

## Gateway Worker Secrets

Set with: `npx wrangler secret put <NAME> --config gateway/wrangler.toml`

### DISCORD_PUBLIC_KEY
- **Source:** Discord Developer Portal → Your Application → General Information → Public Key
- **Description:** Ed25519 public key used to verify Discord webhook signatures
- **Example:** `abc123def456...`

### DISCORD_BOT_TOKEN
- **Source:** Discord Developer Portal → Your Application → Bot → Token
- **Description:** Bot token for sending messages to Discord
- **Example:** `MTk4NjIyNDgzNDcxOTI1MjQ4.G8K5YC.abc123def456...`

## Consumer Worker Secrets

Set with: `npx wrangler secret put <NAME> --config consumer/wrangler.toml`

### LINEAR_API_KEY
- **Source:** Linear Settings → API → Personal API Keys → Create
- **Description:** API key for creating issues, adding comments in Linear
- **Example:** `lin_api_abc123def456...`
- **Permissions:** Read/write access to issues and comments

### POSTHOG_API_KEY
- **Source:** PostHog Project Settings → Personal API Keys → Create
- **Description:** API key for querying session recordings and user data
- **Example:** `phc_abc123def456...`
- **Permissions:** Read access to recordings and persons

### POSTHOG_PROJECT_ID
- **Source:** PostHog project URL: `app.posthog.com/project/YOUR_ID`
- **Description:** PostHog project identifier
- **Example:** `12345`

### GITHUB_TOKEN
- **Source:** GitHub Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
- **Description:** Token for creating branches, commits, and pull requests
- **Example:** `ghp_abc123def456...`
- **Scopes required:** `repo` (full control of private repositories)

### DISCORD_BOT_TOKEN
- **Source:** Same as gateway worker
- **Description:** Bot token for sending status messages to Discord
- **Example:** `MTk4NjIyNDgzNDcxOTI1MjQ4.G8K5YC.abc123def456...`

### CLOUDFLARE_ACCOUNT_ID
- **Source:** Cloudflare Dashboard → Account Home (visible in URL and sidebar)
- **Description:** Your Cloudflare account identifier
- **Example:** `abc123def456ghi789...`

### CLOUDFLARE_API_TOKEN
- **Source:** Cloudflare Dashboard → My Profile → API Tokens → Create Token
- **Description:** Token for invoking Cloudflare Containers
- **Example:** `abc123def456...`
- **Permissions required:**
  - Account.Cloudflare Workers: Edit
  - Account.Cloudflare Containers: Edit

## Container Runtime Environment Variables

These are **not** Wrangler secrets. They are passed at runtime by the consumer worker to the container.

### GITHUB_TOKEN
- Passed from consumer worker's `GITHUB_TOKEN` secret
- Used for git operations inside the container

### LINEAR_API_KEY
- Passed from consumer worker's `LINEAR_API_KEY` secret
- Used for Linear API calls inside the container (if needed)

## Security Best Practices

1. **Rotate tokens regularly** (every 90 days minimum)
2. **Use minimal permissions** (only what's needed for each service)
3. **Never commit secrets to git**
4. **Use different tokens for dev and production**
5. **Monitor token usage** in each service's audit logs
6. **Revoke tokens immediately** if compromised

## Verification Checklist

Before deploying, verify each secret:

```bash
# Gateway secrets
npx wrangler secret list --config gateway/wrangler.toml
# Should show: DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN

# Consumer secrets
npx wrangler secret list --config consumer/wrangler.toml
# Should show: LINEAR_API_KEY, POSTHOG_API_KEY, POSTHOG_PROJECT_ID,
#              GITHUB_TOKEN, DISCORD_BOT_TOKEN, CLOUDFLARE_ACCOUNT_ID,
#              CLOUDFLARE_API_TOKEN
```

## Testing Secrets

Test each secret before full deployment:

### Discord
```bash
curl -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
  https://discord.com/api/v10/users/@me
```

### Linear
```bash
curl -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ viewer { name } }"}' \
  https://api.linear.app/graphql
```

### PostHog
```bash
curl -H "Authorization: Bearer $POSTHOG_API_KEY" \
  https://app.posthog.com/api/projects/$POSTHOG_PROJECT_ID/
```

### GitHub
```bash
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user
```

### Cloudflare
```bash
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify
```

## Troubleshooting

### Secret not found error
- Run `npx wrangler secret list --config <config>` to verify secret is set
- Secret names are case-sensitive
- Redeploy worker after setting secrets: `npm run deploy:gateway` or `npm run deploy:consumer`

### Authentication failed
- Verify secret value is correct (test with curl)
- Check token hasn't expired
- Verify permissions/scopes are sufficient
- Check service status page (Discord, Linear, GitHub, PostHog, Cloudflare)

### Secret not updating
- Use `npx wrangler secret put <NAME>` to overwrite
- Redeploy worker after updating: `npm run deploy:gateway` or `npm run deploy:consumer`
- Old deployments keep their secrets; rollback if needed

## Emergency Response

If a secret is compromised:

1. **Immediately revoke** the token in the source service
2. **Generate a new token**
3. **Update the secret** in Wrangler
4. **Redeploy workers** to pick up new secret
5. **Audit logs** to see if the compromised token was used
6. **Document the incident** and update security procedures
