const { SlashCommandBuilder } = require('discord.js');
const { getEconomy } = require('../../utils/helpers');

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Récupérer ta récompense quotidienne'),
  async execute(interaction) {
    const account = await getEconomy(interaction.guild.id, interaction.user.id);

    if (account.lastDaily && Date.now() - account.lastDaily.getTime() < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (Date.now() - account.lastDaily.getTime());
      const hours = Math.ceil(remaining / (60 * 60 * 1000));
      return interaction.reply({ content: `⏳ Reviens dans environ ${hours}h pour ta prochaine récompense.`, ephemeral: true });
    }

    const reward = Math.floor(Math.random() * 100) + 100; // 100-200
    account.balance += reward;
    account.lastDaily = new Date();
    await account.save();

    await interaction.reply(`🎁 Tu as reçu **${reward}** pièces ! Nouveau solde : **${account.balance}**.`);
  },
};
