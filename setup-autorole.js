const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-autorole')
    .setDescription('Définir le rôle donné automatiquement aux nouveaux membres')
    .addRoleOption((o) => o.setName('role').setDescription('Rôle à attribuer').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const config = await getConfig(interaction.guild.id);
    config.autoRoleId = role.id;
    await config.save();
    await interaction.reply(`✅ Le rôle ${role} sera donné automatiquement aux nouveaux membres.`);
  },
};
