import { Client, GatewayIntentBits } from 'discord.js';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!DISCORD_BOT_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
  console.error('Missing required environment variables:');
  console.error('- DISCORD_BOT_TOKEN');
  console.error('- CLOUDFLARE_ACCOUNT_ID');
  console.error('- CLOUDFLARE_API_TOKEN');
  process.exit(1);
}
const QUEUE_NAME = 'bugbot-commands';

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  console.log('Listening for @mentions...');
});

client.on('messageCreate', async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if bot is mentioned
  if (!message.mentions.has(client.user.id)) return;

  console.log(`📨 Mentioned by ${message.author.tag}: ${message.content}`);

  // Parse command
  const content = message.content.replace(`<@${client.user.id}>`, '@bugbot').trim();
  const commandMatch = content.match(/@bugbot\s+(contextualize|fix)/i);

  if (!commandMatch) {
    await message.reply('Invalid command. Use `@Bug Bot contextualize` or `@Bug Bot fix`');
    return;
  }

  const command = commandMatch[1].toLowerCase();

  // Send immediate acknowledgment
  const ackMessage = await message.reply(`🤖 Working on your \`${command}\` request...`);

  // Fetch recent messages for context
  const recentMessages = await message.channel.messages.fetch({ limit: 10 });
  const recentMessagesArray = Array.from(recentMessages.values())
    .reverse()
    .map(m => ({
      id: m.id,
      content: m.content,
      author: {
        id: m.author.id,
        username: m.author.username
      }
    }));

  // Extract references
  const extractedRefs = extractReferences(content, recentMessagesArray);

  // Build queue message
  const queueMessage = {
    command,
    discordContext: {
      channelId: message.channel.id,
      threadId: message.channel.isThread() ? message.channel.id : null,
      messageId: message.id,
      userId: message.author.id,
      guildId: message.guild?.id || '',
      messageContent: content,
      recentMessages: recentMessagesArray
    },
    extractedRefs,
    timestamp: Date.now()
  };

  try {
    // Send to Cloudflare Queue via API
    await sendToQueue(queueMessage);
    console.log(`✅ Queued ${command} command`);
  } catch (error) {
    console.error('Failed to queue command:', error);
    await ackMessage.edit(`❌ Error: Failed to queue command`);
  }
});

// Extract references from messages
function extractReferences(text, recentMessages) {
  const allText = [text, ...recentMessages.map(m => m.content)].join('\n');

  // Linear issue
  const linearMatch = allText.match(/https:\/\/linear\.app\/[^\/]+\/issue\/([A-Z]+-\d+)|([A-Z]+-\d+)/i);
  const linearIssueId = linearMatch ? (linearMatch[1] || linearMatch[2]) : undefined;
  const linearIssueUrl = linearMatch?.[0].startsWith('http') ? linearMatch[0] : undefined;

  // GitHub repo
  const githubMatch = allText.match(/https:\/\/github\.com\/([^\/]+\/[^\/\s]+)/);
  const githubRepoUrl = githubMatch ? githubMatch[0].replace(/\.git$/, '') : undefined;

  // PostHog session
  const posthogMatch = allText.match(/posthog\.com\/.*session[s]?\/([a-f0-9-]+)/i);
  const postHogSessionId = posthogMatch ? posthogMatch[1] : undefined;

  // User email
  const emailMatch = allText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  const userEmail = emailMatch ? emailMatch[0] : undefined;

  return {
    linearIssueId,
    linearIssueUrl,
    githubRepoUrl,
    postHogSessionId,
    userEmail
  };
}

// Send message to Cloudflare Queue
async function sendToQueue(message) {
  // Cloudflare Queues API is not directly accessible from outside Workers
  // Instead, we'll call the consumer worker directly with the queue message
  const url = `https://bugbot-consumer.jorgen-114.workers.dev/__queue`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cloudflare-Queue-Auth': CLOUDFLARE_API_TOKEN // Simple auth
    },
    body: JSON.stringify({
      messages: [{ body: message }]
    })
  });

  if (!response.ok) {
    throw new Error(`Queue API error: ${response.statusText}`);
  }
}

// Login
client.login(DISCORD_BOT_TOKEN);

// Handle errors
client.on('error', console.error);
process.on('unhandledRejection', console.error);
