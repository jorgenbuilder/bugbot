#!/usr/bin/env node

/**
 * Register Discord slash commands for bugbot
 */

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID || '1468319859220811990';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const commands = [
  {
    name: 'contextualize',
    description: 'Create/update Linear issue with context from Discord and PostHog',
    options: [
      {
        name: 'description',
        description: 'Bug description or additional context',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'fix',
    description: 'Generate an automated fix PR for a Linear issue',
    options: [
      {
        name: 'issue',
        description: 'Linear issue URL or ID',
        type: 3, // STRING
        required: false
      }
    ]
  }
];

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

  for (const command of commands) {
    console.log(`Registering command: /${command.name}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command)
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Registered: /${command.name} (ID: ${data.id})`);
    } else {
      const error = await response.text();
      console.error(`❌ Failed to register /${command.name}:`, error);
    }
  }

  console.log('\n✨ Done! Commands are now available in your server.');
  console.log('Usage:');
  console.log('  /contextualize [description]');
  console.log('  /fix [issue]');
}

registerCommands().catch(console.error);
