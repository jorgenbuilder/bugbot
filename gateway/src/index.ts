import { extractReferences, Command, QueueMessage, DiscordContext } from '@bugbot/shared';

// Ed25519 signature verification for Discord
async function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const message = encoder.encode(timestamp + body);

    // Import the public key
    const keyData = hexToBytes(publicKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      false,
      ['verify']
    );

    // Verify the signature
    const signatureData = hexToBytes(signature);
    return await crypto.subtle.verify(
      'Ed25519',
      key,
      signatureData,
      message
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

interface Env {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  BUGBOT_QUEUE: Queue<QueueMessage>;
  BUGBOT_KV: KVNamespace;
}

interface DiscordInteraction {
  type: number;
  data?: {
    content?: string;
  };
  channel_id?: string;
  guild_id?: string;
  member?: {
    user: {
      id: string;
    };
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Verify Discord signature
      const signature = request.headers.get('x-signature-ed25519');
      const timestamp = request.headers.get('x-signature-timestamp');
      const body = await request.text();

      console.log('Received request:', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        bodyLength: body.length
      });

      if (!signature || !timestamp) {
        console.error('Missing signature headers');
        return new Response('Missing signature headers', { status: 401 });
      }

      const isValidRequest = await verifyDiscordSignature(
        body,
        signature,
        timestamp,
        env.DISCORD_PUBLIC_KEY
      );

      if (!isValidRequest) {
        console.error('Invalid signature');
        return new Response('Invalid signature', { status: 401 });
      }

      const interaction: DiscordInteraction = JSON.parse(body);
      console.log('Interaction type:', interaction.type);

      // Handle Discord ping
      if (interaction.type === 1) {
        console.log('Responding to ping');
        return Response.json({ type: 1 });
      }

      // Handle application commands (type 2) or messages (type 4)
      if (interaction.type === 2 || interaction.type === 4) {
        return handleCommand(interaction, env);
      }

      return new Response('Unknown interaction type', { status: 400 });
    } catch (error) {
      console.error('Gateway error:', error);
      return new Response('Internal error', { status: 500 });
    }
  }
};

async function handleCommand(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const content = interaction.data?.content || '';
  const channelId = interaction.channel_id || '';
  const guildId = interaction.guild_id || '';
  const userId = interaction.member?.user?.id || '';

  // Parse @bugbot commands
  const commandMatch = content.match(/@bugbot\s+(contextualize|fix)/i);
  if (!commandMatch) {
    return Response.json({
      type: 4,
      data: {
        content: 'Invalid command. Use `@bugbot contextualize` or `@bugbot fix`'
      }
    });
  }

  const command = commandMatch[1].toLowerCase() as Command;

  // Fetch recent messages for context
  const recentMessages = await fetchRecentMessages(channelId, env.DISCORD_BOT_TOKEN);

  const discordContext: DiscordContext = {
    channelId,
    threadId: channelId, // In Discord, thread IDs are the same as channel IDs for threads
    messageId: '', // We'll get this from the interaction ID
    userId,
    guildId,
    messageContent: content,
    recentMessages
  };

  const extractedRefs = extractReferences(discordContext);

  // Enqueue the command for async processing
  const queueMessage: QueueMessage = {
    command,
    discordContext,
    extractedRefs,
    timestamp: Date.now()
  };

  await env.BUGBOT_QUEUE.send(queueMessage);

  // Immediate response
  return Response.json({
    type: 4,
    data: {
      content: `🤖 Working on your \`${command}\` request...`
    }
  });
}

async function fetchRecentMessages(channelId: string, botToken: string): Promise<DiscordContext['recentMessages']> {
  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=10`, {
      headers: {
        'Authorization': `Bot ${botToken}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch messages:', await response.text());
      return [];
    }

    const messages = await response.json() as Array<{
      id: string;
      content: string;
      author: {
        id: string;
        username: string;
      };
    }>;

    return messages.map(m => ({
      id: m.id,
      content: m.content,
      author: {
        id: m.author.id,
        username: m.author.username
      }
    }));
  } catch (error) {
    console.error('Error fetching recent messages:', error);
    return [];
  }
}
