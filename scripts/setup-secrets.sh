#!/bin/bash
set -e

echo "🔐 Setting up secrets..."
echo ""

# Function to prompt and set secret
set_secret() {
    local name=$1
    local config=$2
    local description=$3

    echo "Enter $description:"
    read -r value
    echo "$value" | npx wrangler secret put "$name" --config "$config"
    echo "✅ $name set"
    echo ""
}

# Gateway secrets
echo "=== Gateway Worker Secrets ==="
set_secret "DISCORD_PUBLIC_KEY" "gateway/wrangler.toml" "Discord Public Key"
set_secret "DISCORD_BOT_TOKEN" "gateway/wrangler.toml" "Discord Bot Token"

# Consumer secrets
echo "=== Consumer Worker Secrets ==="
set_secret "LINEAR_API_KEY" "consumer/wrangler.toml" "Linear API Key"
set_secret "POSTHOG_API_KEY" "consumer/wrangler.toml" "PostHog API Key"
set_secret "POSTHOG_PROJECT_ID" "consumer/wrangler.toml" "PostHog Project ID"
set_secret "GITHUB_TOKEN" "consumer/wrangler.toml" "GitHub Token"
set_secret "DISCORD_BOT_TOKEN" "consumer/wrangler.toml" "Discord Bot Token"
set_secret "CLOUDFLARE_ACCOUNT_ID" "consumer/wrangler.toml" "Cloudflare Account ID"
set_secret "CLOUDFLARE_API_TOKEN" "consumer/wrangler.toml" "Cloudflare API Token"

echo "✅ All secrets configured!"
