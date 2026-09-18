const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Envoyer une suggestion pour le serveur')
    .addStringOption((o) => o.setName('texte').setDescription('Ta suggestion').setRequired(true)),
  async execute(interaction) {
    const text = interaction.options.getString('texte');
    const config = await getConfig(interaction.guild.id);
    const channel = config.suggestionsChannelId
      ? interaction.guild.channels.cache.get(config.suggestionsChannelId)
      : interaction.channel;

    const embed = new EmbedBuilder()
      .setTitle('💡 Nouvelle suggestion')
      .setDescription(text)
      .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
      .setColor(0x57f287);

    const message = await channel.send({ embeds: [embed] });
    await message.react('✅');
    await message.react('❌');

    await interaction.reply({ content: `✅ Suggestion envoyée dans ${channel} !`, ephemeral: true });
  },
};
