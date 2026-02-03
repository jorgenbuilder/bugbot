# Bugbot Container Executor

This container runs Claude Code in a sandboxed environment for the `fix` command.

## Building

```bash
docker build -t bugbot-executor .
```

## Deploying to Cloudflare

Cloudflare Containers is in beta. Follow these steps:

1. Build and tag the image:
```bash
docker build -t bugbot-executor .
docker tag bugbot-executor:latest gcr.io/YOUR_PROJECT/bugbot-executor:latest
```

2. Push to a container registry (GCR, Docker Hub, etc.):
```bash
docker push gcr.io/YOUR_PROJECT/bugbot-executor:latest
```

3. Deploy to Cloudflare Containers via their API or dashboard:
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

## Testing Locally

```bash
docker run -it --rm \
  -e GITHUB_TOKEN="your-token" \
  -e LINEAR_API_KEY="your-key" \
  bugbot-executor \
  bash
```

Then test the execution script:
```bash
echo '{"prompt": "echo test", "env": {}}' | /usr/local/bin/execute
```

## Environment Variables

The container expects these environment variables to be passed at runtime:
- `GITHUB_TOKEN`: GitHub personal access token
- `LINEAR_API_KEY`: Linear API key

## Security

- The container runs as a non-root user in production
- File system access is limited to /workspace
- Network egress is limited to GitHub, Linear, and Anthropic APIs
- Secrets are passed via environment variables, not baked into the image
