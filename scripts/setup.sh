#!/bin/bash
set -e

echo "🚀 Setting up bugbot..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create KV namespaces
echo "🗄️  Creating KV namespaces..."
KV_ID=$(npx wrangler kv:namespace create "BUGBOT_KV" --preview | grep -o 'id = "[^"]*' | cut -d'"' -f2)
KV_PREVIEW_ID=$(npx wrangler kv:namespace create "BUGBOT_KV" --preview | grep -o 'id = "[^"]*' | cut -d'"' -f2)

echo "KV Namespace ID: $KV_ID"
echo "KV Preview ID: $KV_PREVIEW_ID"
echo ""
echo "⚠️  Update these IDs in gateway/wrangler.toml and consumer/wrangler.toml"

# Create queues
echo "📨 Creating queues..."
npx wrangler queues create bugbot-commands || echo "Queue already exists"
npx wrangler queues create bugbot-commands-dlq || echo "DLQ already exists"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update KV namespace IDs in wrangler.toml files"
echo "2. Set secrets with: npm run setup:secrets"
echo "3. Build and deploy container (see container/README.md)"
echo "4. Deploy workers with: npm run deploy:all"
