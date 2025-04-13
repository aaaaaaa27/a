const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

// Load the configuration and data files
const config = require('./config.json');
let data = require('./data.json');

// Setup bot client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Save updated data to the file
function saveData() {
  fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
}

// Format the full message
function formatMessage({ highlightUser = '', showRemovals = false } = {}) {
  let msg = `<@&${config.ping_role_id}> \n`;
  msg += `Division Name: ${config.division_name}\n\n`;

  msg += `List any officers that need to be removed (demoted to WO):\n`;
  if (showRemovals) {
    for (const r of data.removals) {
      msg += `**${r}**\n`;
    }
  }

  msg += `\nList ALL your division's officer slots and who should be filling them:\n`;
  for (const s of data.slots) {
    const formattedUser =
    s.user === '' ? '' :
    s.user === highlightUser ? `**${s.user}**` : s.user;  
    msg += `${s.rank} - ${formattedUser}\n`;
  }

  return msg;
}

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('addslot')
    .setDescription('Assign a user to a slot')
    .addStringOption(opt =>
      opt.setName('username').setDescription('The username').setRequired(true))
    .addStringOption(opt =>
      opt.setName('rank').setDescription('Rank to assign to').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removeslot')
    .setDescription('Remove a user from a slot')
    .addStringOption(opt =>
      opt.setName('username').setDescription('Username to remove').setRequired(true)),

  new SlashCommandBuilder()
    .setName('viewslots')
    .setDescription('View current slot assignments')
];

const rest = new REST({ version: '10' }).setToken(config.token);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(config.client_id, config.guild_id), {
      body: commands.map(c => c.toJSON())
    });
    console.log('✅ Commands registered.');
  } catch (err) {
    console.error(err);
  }
})();

// Bot is ready
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'addslot') {
        const username = interaction.options.getString('username');
        const rank = interaction.options.getString('rank');
      
        // Find the slot that matches the rank and is empty
        const slotIndex = data.slots.findIndex(s => s.rank === rank && s.user === '');
        if (slotIndex === -1) {
          return interaction.reply({ content: `❌ No empty slot found for rank "${rank}".`, flags: 1 << 6 });
        }
      
        // Find if the user is already assigned to any slot
        const existingSlot = data.slots.find(s => s.user.replace(/\*\*/g, '') === username);
        if (existingSlot) {
          return interaction.reply({ content: `❌ User "${username}" is already assigned to a slot.`, flags: 1 << 6 });
        }
      
        // Assign the user to the first available empty slot
        // Bold the username only for the first time
        const isFirstAssignment = data.slots[slotIndex].user === '';
        data.slots[slotIndex].user = username;
      
        // Save data and send a formatted message
        saveData();
        return interaction.reply({
          content: formatMessage({ highlightUser: username }),
          allowedMentions: { parse: ['roles'] }
        });
      }
            

    if (commandName === 'removeslot') {
      const username = interaction.options.getString('username');

      const slot = data.slots.find(s => s.user.replace(/\*\*/g, '') === username);
      if (!slot) {
        return interaction.reply({ content: `❌ User "${username}" not found in any slot.`, flags: 1 << 6 });
      }

      // Remove user from all slots
      for (const s of data.slots) {
        if (s.user.replace(/\*\*/g, '') === username) {
          s.user = ''; // Clear the user
        }
      }

      // Add user to removals list
      data.removals.push(username);
      saveData();

      const msg = formatMessage({ showRemovals: true });

      // Clear removals after message is sent
      data.removals = [];
      saveData();

      return interaction.reply({
        content: msg,
        allowedMentions: { parse: ['roles'] }
      });
    }

    if (commandName === 'viewslots') {
      return interaction.reply({
        content: formatMessage(),
        allowedMentions: { parse: ['roles'] }
      });
    }

  } catch (err) {
    console.error('❌ Error handling interaction:', err);
    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request.',
        flags: 1 << 6
      });
    }
  }
});

client.login(config.token);
