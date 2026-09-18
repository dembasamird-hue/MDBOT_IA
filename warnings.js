const { SlashCommandBuilder } = require('discord.js');
const { Warning } = require('../../database/schemas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Voir les avertissements d\'un membre')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre à consulter').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('membre');
    const list = await Warning.find({ guildId: interaction.guild.id, userId: target.id }).sort({ createdAt: -1 }).limit(10);

    if (list.length === 0) return interaction.reply(`${target.tag} n'a aucun avertissement.`);

    const text = list
      .map((w, i) => `**${i + 1}.** ${w.reason} — <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`)
      .join('\n');

    await interaction.reply(`**Avertissements de ${target.tag}** (${list.length}) :\n${text}`);
  },
};
