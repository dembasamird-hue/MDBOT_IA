const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mp')
    .setDescription('[Staff] Envoyer un MP à un membre au nom du serveur')
    .addUserOption((o) => o.setName('membre').setDescription('Destinataire').setRequired(true))
    .addStringOption((o) => o.setName('message').setDescription('Contenu du message').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const target = interaction.options.getUser('membre');
    const content = interaction.options.getString('message');

    const sent = await target.send(`📩 Message du staff de **${interaction.guild.name}** :\n${content}`).catch(() => null);

    if (!sent) return interaction.reply({ content: '❌ Impossible d\'envoyer un MP à ce membre (DM fermés).', ephemeral: true });
    await interaction.reply({ content: `✅ Message envoyé à **${target.tag}**.`, ephemeral: true });
  },
};
