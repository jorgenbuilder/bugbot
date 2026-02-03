import { QueueMessage } from '@bugbot/shared';
import { handleContextualize } from './commands/contextualize';
import { handleFix } from './commands/fix';

interface Env {
  BUGBOT_KV: KVNamespace;
  LINEAR_API_KEY: string;
  POSTHOG_API_KEY: string;
  POSTHOG_PROJECT_ID: string;
  GITHUB_TOKEN: string;
  DISCORD_BOT_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  CONTAINER_BINDING_NAME?: string;
}

export default {
  // Queue consumer (from Cloudflare Queue)
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processMessage(message.body, env);
        message.ack();
      } catch (error) {
        console.error('Error processing message:', error);
        message.retry();
      }
    }
  },

  // HTTP endpoint (from gateway-bot)
  async fetch(request: Request, env: Env): Promise<Response> {
    // Simple auth check
    const auth = request.headers.get('X-Cloudflare-Queue-Auth');
    if (auth !== env.CLOUDFLARE_API_TOKEN) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (request.url.endsWith('/__queue') && request.method === 'POST') {
      try {
        const body = await request.json() as { messages: Array<{ body: QueueMessage }> };

        for (const message of body.messages) {
          await processMessage(message.body, env);
        }

        return new Response('OK', { status: 200 });
      } catch (error) {
        console.error('Error processing HTTP queue message:', error);
        return new Response('Error', { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};

async function processMessage(msg: QueueMessage, env: Env): Promise<void> {
  console.log(`Processing ${msg.command} command for channel ${msg.discordContext.channelId}`);

  try {
    if (msg.command === 'contextualize') {
      await handleContextualize(msg, env);
    } else if (msg.command === 'fix') {
      await handleFix(msg, env);
    } else {
      throw new Error(`Unknown command: ${msg.command}`);
    }
  } catch (error) {
    console.error(`Error handling ${msg.command}:`, error);
    await sendDiscordMessage(
      msg.discordContext.channelId,
      `❌ Error processing \`${msg.command}\`: ${error instanceof Error ? error.message : 'Unknown error'}`,
      env.DISCORD_BOT_TOKEN
    );
    throw error;
  }
}

export async function sendDiscordMessage(channelId: string, content: string, botToken: string): Promise<void> {
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send Discord message: ${error}`);
  }
}
