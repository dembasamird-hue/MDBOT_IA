const { SlashCommandBuilder } = require('discord.js');
const { getEconomy } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transférer des pièces à un autre membre')
    .addUserOption((o) => o.setName('membre').setDescription('Destinataire').setRequired(true))
    .addIntegerOption((o) => o.setName('montant').setDescription('Montant à envoyer').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('membre');
    const amount = interaction.options.getInteger('montant');

    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ Tu ne peux pas te payer toi-même.', ephemeral: true });
    if (amount <= 0) return interaction.reply({ content: '❌ Montant invalide.', ephemeral: true });

    const sender = await getEconomy(interaction.guild.id, interaction.user.id);
    if (sender.balance < amount) return interaction.reply({ content: '❌ Solde insuffisant.', ephemeral: true });

    const receiver = await getEconomy(interaction.guild.id, target.id);
    sender.balance -= amount;
    receiver.balance += amount;
    await sender.save();
    await receiver.save();

    await interaction.reply(`✅ **${interaction.user.username}** a envoyé **${amount}** pièces à **${target.username}**.`);
  },
};
