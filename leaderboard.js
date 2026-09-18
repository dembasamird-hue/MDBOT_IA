const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Level } = require('../../database/schemas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Voir le classement des niveaux du serveur'),
  async execute(interaction) {
    const top = await Level.find({ guildId: interaction.guild.id }).sort({ xp: -1 }).limit(10);
    if (top.length === 0) return interaction.reply('Personne n\'a encore d\'XP sur ce serveur.');

    const text = await Promise.all(
      top.map(async (entry, i) => {
        const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
        return `**${i + 1}.** ${user ? user.tag : 'Membre inconnu'} — Niveau ${entry.level} (${entry.xp} XP)`;
      })
    );

    const embed = new EmbedBuilder().setTitle('🏆 Classement des niveaux').setDescription(text.join('\n')).setColor(0xffd700);
    await interaction.reply({ embeds: [embed] });
  },
};
