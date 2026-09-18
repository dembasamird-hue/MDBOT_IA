const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getConfig } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-tempvoice')
    .setDescription('Définir le salon vocal "Créer un salon" (salons temporaires)')
    .addChannelOption((o) => o.setName('salon').setDescription('Salon vocal déclencheur').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const channel = interaction.options.getChannel('salon');
    const config = await getConfig(interaction.guild.id);
    config.tempVoiceChannelId = channel.id;
    config.tempVoiceCategoryId = channel.parentId;
    await config.save();
    await interaction.reply(`✅ Quiconque rejoint ${channel} aura son propre salon vocal temporaire.`);
  },
};
