const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getConfig } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-leave')
    .setDescription('Configurer le message de départ')
    .addChannelOption((o) => o.setName('salon').setDescription('Salon de départ').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption((o) => o.setName('message').setDescription('Message (utilise {user} et {server})'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const channel = interaction.options.getChannel('salon');
    const message = interaction.options.getString('message');
    const config = await getConfig(interaction.guild.id);
    config.leaveChannelId = channel.id;
    if (message) config.leaveMessage = message;
    await config.save();
    await interaction.reply(`✅ Message de départ configuré dans ${channel}.`);
  },
};
