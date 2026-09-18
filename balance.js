const { SlashCommandBuilder } = require('discord.js');
const { getEconomy } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Voir ton solde')
    .addUserOption((o) => o.setName('membre').setDescription('Voir le solde d\'un autre membre')),
  async execute(interaction) {
    const target = interaction.options.getUser('membre') || interaction.user;
    const account = await getEconomy(interaction.guild.id, target.id);
    await interaction.reply(`💰 **${target.username}** possède **${account.balance}** pièces.`);
  },
};
