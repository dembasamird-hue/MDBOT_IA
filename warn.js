const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Warning } = require('../../database/schemas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertir un membre')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre à avertir').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison de l\'avertissement').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getUser('membre');
    const reason = interaction.options.getString('raison');

    await Warning.create({
      guildId: interaction.guild.id,
      userId: target.id,
      reason,
      moderatorId: interaction.user.id,
    });

    const count = await Warning.countDocuments({ guildId: interaction.guild.id, userId: target.id });

    await target.send(`⚠️ Tu as reçu un avertissement sur **${interaction.guild.name}** : ${reason} (avertissement ${count})`).catch(() => {});
    await interaction.reply(`✅ **${target.tag}** averti (${count} au total). Raison : ${reason}`);
  },
};
