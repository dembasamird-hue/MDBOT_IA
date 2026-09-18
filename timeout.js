const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Mettre un membre en sourdine temporairement')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre à mute').setRequired(true))
    .addIntegerOption((o) => o.setName('minutes').setDescription('Durée en minutes (0 pour retirer)').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!target) return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });

    if (minutes === 0) {
      await target.timeout(null);
      return interaction.reply(`🔊 **${target.user.tag}** n'est plus en sourdine.`);
    }

    await target.timeout(minutes * 60 * 1000, reason);
    await target.send(`🔇 Tu as été mis en sourdine sur **${interaction.guild.name}** pour ${minutes} min : ${reason}`).catch(() => {});
    await interaction.reply(`✅ **${target.user.tag}** est en sourdine pour ${minutes} min. Raison : ${reason}`);
  },
};
