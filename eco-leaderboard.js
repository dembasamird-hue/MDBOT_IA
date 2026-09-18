const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Economy } = require('../../database/schemas');

module.exports = {
  data: new SlashCommandBuilder().setName('richest').setDescription('Voir le classement des plus riches du serveur'),
  async execute(interaction) {
    const top = await Economy.find({ guildId: interaction.guild.id }).sort({ balance: -1 }).limit(10);
    if (top.length === 0) return interaction.reply('Personne n\'a encore de pièces sur ce serveur.');

    const text = await Promise.all(
      top.map(async (entry, i) => {
        const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
        return `**${i + 1}.** ${user ? user.tag : 'Membre inconnu'} — ${entry.balance} pièces`;
      })
    );

    const embed = new EmbedBuilder().setTitle('💰 Les plus riches').setDescription(text.join('\n')).setColor(0xffd700);
    await interaction.reply({ embeds: [embed] });
  },
};
