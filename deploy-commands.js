const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const config = require('./config.json'); // Ensure your config.json has token, client_id, guild_id

const commands = [
    new SlashCommandBuilder()
        .setName('addslot')
        .setDescription('Assign a user to a rank slot.')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username to assign')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('The rank to assign them to')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('removeslot')
        .setDescription('Remove a user from a specific rank slot.')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username to remove')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('The rank to remove the user from')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('viewslots')
        .setDescription('View all the officer slots in the division.')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
    try {
        console.log('⏳ Registering slash commands...');
        await rest.put(
            Routes.applicationGuildCommands(config.client_id, config.guild_id),
            { body: commands }
        );
        console.log('✅ Slash commands registered!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();
