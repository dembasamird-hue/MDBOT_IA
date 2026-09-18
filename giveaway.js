const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Giveaway } = require('../../database/schemas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Lancer un giveaway')
    .addStringOption((o) => o.setName('prix').setDescription('Ce qui est à gagner').setRequired(true))
    .addIntegerOption((o) => o.setName('duree').setDescription('Durée en minutes').setRequired(true))
    .addIntegerOption((o) => o.setName('gagnants').setDescription('Nombre de gagnants').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const prize = interaction.options.getString('prix');
    const durationMin = interaction.options.getInteger('duree');
    const winnerCount = interaction.options.getInteger('gagnants');
    const endsAt = new Date(Date.now() + durationMin * 60 * 1000);

    const embed = new EmbedBuilder()
      .setTitle('🎉 GIVEAWAY 🎉')
      .setDescription(
        `**Prix :** ${prize}\n**Gagnants :** ${winnerCount}\n**Fin :** <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n\nRéagis avec 🎉 pour participer !`
      )
      .setColor(0xf47fff);

    await interaction.reply({ embeds: [embed] });
    const message = await interaction.fetchReply();
    await message.react('🎉');

    await Giveaway.create({
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      messageId: message.id,
      prize,
      winnerCount,
      endsAt,
    });
  },
};
