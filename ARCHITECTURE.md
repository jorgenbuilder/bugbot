# Architecture

This document describes the technical architecture of bugbot.

## Overview

```
┌─────────────┐
│   Discord   │
│   Server    │
└──────┬──────┘
       │ @bugbot contextualize/fix
       ▼
┌─────────────────────────────────────────────────┐
│  Gateway Worker (bugbot-gateway)                │
│  - Verifies Discord signatures                  │
│  - Parses commands                              │
│  - Fetches recent messages for context          │
│  - Enqueues job                                 │
│  - Returns immediate "working..." response      │
└──────┬──────────────────────────────────────────┘
       │ Queue message
       ▼
┌─────────────────────────────────────────────────┐
│  Cloudflare Queue (bugbot-commands)             │
│  - Decouples ingress from processing            │
│  - Enables retries and DLQ                      │
│  - Handles backpressure                         │
└──────┬──────────────────────────────────────────┘
       │ Consumer pulls
       ▼
┌─────────────────────────────────────────────────┐
│  Consumer Worker (bugbot-consumer)              │
│  - Processes commands asynchronously            │
│  - Routes to command handlers                   │
│  - Manages API integrations                     │
│  - Updates Discord with results                 │
└──┬────────────────────────────────────────────┬─┘
   │                                            │
   │ contextualize                              │ fix
   ▼                                            ▼
┌──────────────────────┐         ┌──────────────────────────┐
│  Contextualize Flow  │         │  Fix Flow                │
├──────────────────────┤         ├──────────────────────────┤
│ 1. Resolve Linear    │         │ 1. Load Linear issue     │
│    issue (get/create)│         │ 2. Search GitHub code    │
│ 2. Check KV mapping  │         │ 3. Invoke container      │
│ 3. Query PostHog     │         │ 4. Create branch + PR    │
│ 4. Generate context  │         │ 5. Update Linear + Discord│
│ 5. Add Linear comment│         └────────┬─────────────────┘
│ 6. Update Discord    │                  │
└──┬───────────────────┘                  │
   │                                      ▼
   │                    ┌─────────────────────────────────────┐
   │                    │  Container Executor                 │
   │                    │  - Runs Claude Code + git           │
   │                    │  - Clones repo, creates branch      │
   │                    │  - Analyzes code, applies fix       │
   │                    │  - Commits and pushes changes       │
   │                    │  - Respects frontend-only allowlist │
   │                    └─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────┐
│  External Services                              │
│  - Linear: Issue tracking and comments          │
│  - PostHog: Session recordings and analytics    │
│  - GitHub: Code search, branches, PRs           │
│  - Discord: Status messages                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Storage                                        │
│  - KV: Discord thread → Linear issue mapping    │
│  - Queue DLQ: Failed messages for inspection    │
└─────────────────────────────────────────────────┘
```

## Components

### Gateway Worker

**Purpose:** Fast ingress for Discord events

**Responsibilities:**
- Verify Ed25519 signatures from Discord
- Parse `@bugbot contextualize|fix` commands
- Fetch recent thread messages for context
- Extract references (Linear issues, GitHub repos, etc.)
- Enqueue job to queue
- Return immediate acknowledgment to Discord

**Tech Stack:**
- Cloudflare Workers
- discord-interactions library
- Workers Queue producer binding
- Workers KV binding

**Performance:**
- < 100ms response time (Discord requirement)
- No blocking operations
- No external API calls except Discord message fetch

### Consumer Worker

**Purpose:** Async command processing

**Responsibilities:**
- Pull messages from queue
- Route to command handlers
- Handle retries and errors
- Send results to Discord

**Tech Stack:**
- Cloudflare Workers
- Workers Queue consumer binding
- Workers KV binding
- External API clients (Linear, PostHog, GitHub)

**Performance:**
- Processes jobs in background
- Retries failed jobs (max 3 attempts)
- Dead-letter queue for permanent failures

### Container Executor

**Purpose:** Sandboxed Claude Code execution

**Responsibilities:**
- Run Claude Code CLI in isolated environment
- Execute git operations (clone, branch, commit, push)
- Enforce file path allowlist (frontend only)
- Return execution results

**Tech Stack:**
- Node.js 20 slim Docker image
- Claude Code CLI
- Git
- Bash

**Security:**
- No persistent storage
- Limited network egress
- Environment-based secrets
- Ephemeral execution

### Shared Library

**Purpose:** Common types and utilities

**Exports:**
- TypeScript interfaces
- Reference extractors (Linear, GitHub, PostHog)
- Shared constants

## Data Flow

### Contextualize Command

1. User mentions `@bugbot contextualize` in Discord
2. Gateway receives webhook, verifies signature
3. Gateway fetches recent messages for context
4. Gateway extracts references (Linear ID, user email, etc.)
5. Gateway enqueues job, returns "working..."
6. Consumer pulls job from queue
7. Consumer resolves Linear issue:
   - If Linear ID in message → fetch issue
   - Else if Discord thread in KV → fetch mapped issue
   - Else → create new issue, save mapping to KV
8. Consumer queries PostHog:
   - If session ID in message → fetch specific recording
   - Else if user email in message → fetch recent recordings
9. Consumer generates context packet (Markdown)
10. Consumer adds comment to Linear issue
11. Consumer sends success message to Discord

### Fix Command

1. User mentions `@bugbot fix` in Discord
2. Gateway processes (same as contextualize steps 2-5)
3. Consumer pulls job from queue
4. Consumer resolves Linear issue (same as contextualize step 7)
5. Consumer extracts GitHub repo URL from message/context
6. Consumer searches GitHub for relevant files
7. Consumer filters to frontend paths (allowlist)
8. Consumer invokes container executor with:
   - Repo URL
   - Branch name
   - Issue description
   - Relevant file paths
9. Container executes:
   - Clone repo
   - Create/checkout branch
   - Run Claude Code to analyze and fix
   - Commit changes
   - Push to origin
10. Consumer creates pull request on GitHub
11. Consumer adds PR link to Linear issue
12. Consumer sends success message to Discord
13. Vercel auto-deploys preview (external)

## Storage

### KV Namespace (BUGBOT_KV)

**Purpose:** Persistent conversational state

**Schema:**
```
Key: discord:${threadId}
Value: ${linearIssueId}
```

**Usage:**
- Map Discord threads to Linear issues
- Enable follow-up commands without repeating context
- TTL: No expiration (manual cleanup)

**Access:**
- Gateway: Read
- Consumer: Read/Write

### Queue (bugbot-commands)

**Purpose:** Async job processing

**Schema:**
```typescript
{
  command: 'contextualize' | 'fix',
  discordContext: {
    channelId: string,
    threadId?: string,
    messageId: string,
    userId: string,
    guildId: string,
    messageContent: string,
    recentMessages: Array<...>
  },
  extractedRefs: {
    linearIssueId?: string,
    linearIssueUrl?: string,
    githubRepoUrl?: string,
    postHogSessionId?: string,
    userEmail?: string
  },
  timestamp: number
}
```

**Config:**
- Max batch size: 1 (process one at a time)
- Max batch timeout: 30s
- Max retries: 3
- Dead-letter queue: bugbot-commands-dlq

### Dead-Letter Queue (bugbot-commands-dlq)

**Purpose:** Failed message inspection

**Retention:** 7 days

**Access:**
```bash
npx wrangler queues consumer get bugbot-commands-dlq
```

## External Integrations

### Discord API

**Endpoints:**
- `POST /channels/:id/messages` - Send messages
- `GET /channels/:id/messages` - Fetch recent messages
- `POST /interactions/:id/:token/callback` - Interaction response

**Authentication:** Bearer token (Bot token)

**Rate Limits:** 50 requests/second per channel

### Linear API

**Endpoints:**
- GraphQL: `POST https://api.linear.app/graphql`
- Queries: `issue`, `teams`
- Mutations: `issueCreate`, `commentCreate`

**Authentication:** API key header

**Rate Limits:** 1000 requests/hour

### PostHog API

**Endpoints:**
- `GET /api/projects/:id/persons` - Find user by email
- `GET /api/projects/:id/session_recordings` - Fetch recordings
- `GET /api/projects/:id/session_recordings/:id` - Fetch specific recording

**Authentication:** Bearer token

**Rate Limits:** 1000 requests/minute

### GitHub API

**Endpoints:**
- `GET /search/code` - Search code files
- `GET /repos/:owner/:repo/contents/:path` - Fetch file content
- `POST /repos/:owner/:repo/git/refs` - Create branch
- `POST /repos/:owner/:repo/pulls` - Create pull request

**Authentication:** Token header

**Rate Limits:** 5000 requests/hour (authenticated)

### Cloudflare Containers API

**Endpoints:**
- `POST /accounts/:id/workers/containers/:name/execute` - Invoke container

**Authentication:** Bearer token (API token)

**Payload:**
```json
{
  "prompt": "string",
  "env": {
    "GITHUB_TOKEN": "string",
    "LINEAR_API_KEY": "string"
  }
}
```

## Security

### Discord Signature Verification

- Verifies Ed25519 signatures using `discord-interactions`
- Rejects requests with invalid signatures
- Prevents unauthorized webhook calls

### Secret Management

- All secrets stored as Wrangler secrets
- Secrets passed to container as env vars at runtime
- No secrets in code or config files
- Rotation: Every 90 days minimum

### Frontend-Only Allowlist

- Container only modifies files in:
  - `src/`
  - `app/`
  - `components/`
  - `pages/`
- Prevents modifications to:
  - Configuration files
  - Backend code
  - Infrastructure code
  - Package dependencies

### Container Isolation

- Ephemeral execution (no persistence)
- Limited network egress
- No shell access
- Runs as non-root user (production)

## Scalability

### Current Limits

- Gateway: 100k requests/day (free tier)
- Consumer: Processes 1 job at a time
- Container: Single instance (beta)

### Scaling Considerations

**More users:**
- Increase queue consumer concurrency
- Add more container instances
- Upgrade to paid Workers plan

**More commands:**
- Add command-specific queues
- Implement priority queuing
- Add command aliases

**More integrations:**
- Add new client libraries
- Extend extractors
- Add new command handlers

## Monitoring

### Metrics

- Worker invocations (Cloudflare dashboard)
- Queue depth (Wrangler CLI)
- Error rates (Worker logs)
- API rate limit usage (external dashboards)

### Logs

- Gateway: `npx wrangler tail --config gateway/wrangler.toml`
- Consumer: `npx wrangler tail --config consumer/wrangler.toml`

### Alerts

Set up Cloudflare Workers alerts for:
- Error rate > 5%
- Queue depth > 100
- Worker duration > 10s

## Cost Breakdown

Based on 1000 commands/day:

- Workers requests: ~30k/day (free tier)
- KV reads: ~3k/day (free tier)
- KV writes: ~1k/day (free tier)
- Queue operations: ~3k/day (< $1/month)
- Container invocations: ~500/day (varies)

**Total:** $0-10/month on free tier + container costs

## Future Improvements

### Performance
- [ ] Parallel PostHog queries
- [ ] Cache Linear team IDs
- [ ] Batch GitHub API calls

### Features
- [ ] `@bugbot status` command
- [ ] `@bugbot deploy` command (deploy PR)
- [ ] Slash commands (instead of mentions)
- [ ] Rich embeds in Discord

### Reliability
- [ ] Exponential backoff for retries
- [ ] Circuit breakers for external APIs
- [ ] Graceful degradation

### Observability
- [ ] Structured logging
- [ ] OpenTelemetry tracing
- [ ] Custom metrics

### Security
- [ ] Rate limiting per user
- [ ] Command approval workflow
- [ ] Audit log to Linear
