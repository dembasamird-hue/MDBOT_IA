const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getConfig } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-logs')
    .setDescription('Définir le salon des logs de modération')
    .addChannelOption((o) => o.setName('salon').setDescription('Salon des logs').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const channel = interaction.options.getChannel('salon');
    const config = await getConfig(interaction.guild.id);
    config.logChannelId = channel.id;
    await config.save();
    await interaction.reply(`✅ Les logs seront envoyés dans ${channel}.`);
  },
};
