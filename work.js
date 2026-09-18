const { SlashCommandBuilder } = require('discord.js');
const { getEconomy } = require('../../utils/helpers');

const COOLDOWN_MS = 60 * 60 * 1000;
const JOBS = ['Tu as livré des pizzas', 'Tu as codé un bot', 'Tu as vendu des légumes', 'Tu as fait un stream', 'Tu as aidé un voisin'];

module.exports = {
  data: new SlashCommandBuilder().setName('work').setDescription('Travailler pour gagner des pièces'),
  async execute(interaction) {
    const account = await getEconomy(interaction.guild.id, interaction.user.id);

    if (account.lastWork && Date.now() - account.lastWork.getTime() < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (Date.now() - account.lastWork.getTime());
      const minutes = Math.ceil(remaining / (60 * 1000));
      return interaction.reply({ content: `⏳ Tu es fatigué, reviens dans ${minutes} min.`, ephemeral: true });
    }

    const reward = Math.floor(Math.random() * 50) + 20; // 20-70
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];
    account.balance += reward;
    account.lastWork = new Date();
    await account.save();

    await interaction.reply(`💼 ${job} et gagné **${reward}** pièces ! Solde : **${account.balance}**.`);
  },
};
