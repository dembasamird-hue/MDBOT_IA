const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mpall')
    .setDescription('[Staff] Envoyer un MP à tous les membres du serveur')
    .addStringOption((o) => o.setName('message').setDescription('Contenu du message').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const content = interaction.options.getString('message');
    await interaction.reply({ content: '📨 Envoi en cours, ça peut prendre du temps selon la taille du serveur...', ephemeral: true });

    const members = await interaction.guild.members.fetch();
    let success = 0;
    let failed = 0;

    for (const [, member] of members) {
      if (member.user.bot) continue;
      const sent = await member
        .send(`📢 Annonce du staff de **${interaction.guild.name}** :\n${content}`)
        .catch(() => null);
      if (sent) success++;
      else failed++;
      // petite pause pour éviter le rate-limit Discord
      await new Promise((r) => setTimeout(r, 300));
    }

    await interaction.followUp({ content: `✅ Terminé. Envoyés : ${success} — Échecs (DM fermés) : ${failed}`, ephemeral: true });
  },
};
