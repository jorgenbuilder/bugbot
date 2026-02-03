import { QueueMessage, LinearIssue, PostHogRecording } from '@bugbot/shared';
import { createLinearClient, getIssue, createIssue, addComment } from '../clients/linear';
import { createPostHogClient, findRecordingsForUser, findRecordingsBySession } from '../clients/posthog';
import { sendDiscordMessage } from '../index';

interface Env {
  BUGBOT_KV: KVNamespace;
  LINEAR_API_KEY: string;
  POSTHOG_API_KEY: string;
  POSTHOG_PROJECT_ID: string;
  DISCORD_BOT_TOKEN: string;
}

export async function handleContextualize(msg: QueueMessage, env: Env): Promise<void> {
  const linearClient = createLinearClient(env.LINEAR_API_KEY);
  const postHogClient = createPostHogClient(env.POSTHOG_API_KEY, env.POSTHOG_PROJECT_ID);

  // 1. Resolve Linear issue
  let linearIssue: LinearIssue | null = null;

  if (msg.extractedRefs.linearIssueId) {
    // Try to get existing issue
    linearIssue = await getIssue(linearClient, msg.extractedRefs.linearIssueId);
  }

  if (!linearIssue) {
    // Check KV mapping
    const kvKey = `discord:${msg.discordContext.threadId || msg.discordContext.channelId}`;
    const mappedIssueId = await env.BUGBOT_KV.get(kvKey);

    if (mappedIssueId) {
      linearIssue = await getIssue(linearClient, mappedIssueId);
    }
  }

  if (!linearIssue) {
    // Create new issue
    const teamId = await getDefaultTeamId(linearClient);
    const title = extractTitle(msg.discordContext.messageContent);
    linearIssue = await createIssue(linearClient, teamId, title, 'Created by @bugbot');

    // Store mapping in KV
    const kvKey = `discord:${msg.discordContext.threadId || msg.discordContext.channelId}`;
    await env.BUGBOT_KV.put(kvKey, linearIssue.id);
  }

  // 2. Query PostHog for recordings
  let recordings: PostHogRecording[] = [];

  if (msg.extractedRefs.postHogSessionId) {
    const recording = await findRecordingsBySession(postHogClient, msg.extractedRefs.postHogSessionId);
    if (recording) {
      recordings = [recording];
    }
  } else if (msg.extractedRefs.userEmail) {
    recordings = await findRecordingsForUser(postHogClient, msg.extractedRefs.userEmail, 5);
  }

  // 3. Generate context packet
  const contextPacket = generateContextPacket(
    linearIssue,
    recordings,
    msg.discordContext.messageContent
  );

  // 4. Post comment to Linear
  await addComment(linearClient, linearIssue.id, contextPacket);

  // 5. Send Discord confirmation
  const discordMessage = recordings.length > 0
    ? `✅ Added context to Linear issue [${linearIssue.identifier}](${linearIssue.url}) with ${recordings.length} PostHog recording(s)`
    : `✅ Added context to Linear issue [${linearIssue.identifier}](${linearIssue.url}) (no PostHog recordings found)`;

  await sendDiscordMessage(msg.discordContext.channelId, discordMessage, env.DISCORD_BOT_TOKEN);
}

function extractTitle(messageContent: string): string {
  // Remove @bugbot mention and command
  const cleaned = messageContent
    .replace(/@bugbot/gi, '')
    .replace(/contextualize/gi, '')
    .trim();

  // Take first sentence or first 100 chars
  const firstSentence = cleaned.split(/[.!?]/)[0].trim();
  return firstSentence.slice(0, 100) || 'Bug report from Discord';
}

function generateContextPacket(
  linearIssue: LinearIssue,
  recordings: PostHogRecording[],
  messageContent: string
): string {
  const lines: string[] = [];

  lines.push('# Context from Discord (@bugbot)');
  lines.push('');

  if (recordings.length > 0) {
    lines.push('## PostHog Recordings');
    recordings.forEach(rec => {
      const duration = Math.round(rec.duration / 1000);
      lines.push(`- [Session ${rec.id}](${rec.url}) (${duration}s) - ${rec.timestamp}`);
    });
    lines.push('');
  }

  lines.push('## Bug Behavior');
  lines.push(messageContent);
  lines.push('');

  lines.push('## Intended Behavior');
  lines.push('_To be determined from recordings and investigation_');
  lines.push('');

  lines.push('## Reproduction Steps');
  lines.push('1. Review PostHog recordings');
  lines.push('2. Identify user actions leading to issue');
  lines.push('3. Document expected vs actual behavior');
  lines.push('');

  return lines.join('\n');
}

async function getDefaultTeamId(linearClient: ReturnType<typeof createLinearClient>): Promise<string> {
  const query = `
    query {
      teams {
        nodes {
          id
          name
        }
      }
    }
  `;

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': linearClient.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.statusText}`);
  }

  const data = await response.json() as {
    data: { teams: { nodes: Array<{ id: string; name: string }> } }
  };

  if (data.data.teams.nodes.length === 0) {
    throw new Error('No Linear teams found');
  }

  return data.data.teams.nodes[0].id;
}
