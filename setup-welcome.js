const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getConfig } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-welcome')
    .setDescription('Configurer le message de bienvenue')
    .addChannelOption((o) => o.setName('salon').setDescription('Salon de bienvenue').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption((o) => o.setName('message').setDescription('Message (utilise {user} et {server})'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const channel = interaction.options.getChannel('salon');
    const message = interaction.options.getString('message');
    const config = await getConfig(interaction.guild.id);
    config.welcomeChannelId = channel.id;
    if (message) config.welcomeMessage = message;
    await config.save();
    await interaction.reply(`✅ Message de bienvenue configuré dans ${channel}.`);
  },
};
