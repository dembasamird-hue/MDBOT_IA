const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-ticket')
    .setDescription('Mettre en place le système de tickets')
    .addChannelOption((o) => o.setName('categorie').setDescription('Catégorie où créer les tickets').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    .addRoleOption((o) => o.setName('role-staff').setDescription('Rôle du staff qui voit les tickets').setRequired(true))
    .addChannelOption((o) => o.setName('salon-panel').setDescription('Salon où poster le bouton "Créer un ticket"').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addChannelOption((o) => o.setName('salon-logs').setDescription('Salon des logs de tickets fermés').addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const category = interaction.options.getChannel('categorie');
    const staffRole = interaction.options.getRole('role-staff');
    const panelChannel = interaction.options.getChannel('salon-panel');
    const logChannel = interaction.options.getChannel('salon-logs');

    const config = await getConfig(interaction.guild.id);
    config.ticketCategoryId = category.id;
    config.ticketStaffRoleId = staffRole.id;
    if (logChannel) config.ticketLogChannelId = logChannel.id;
    await config.save();

    const embed = new EmbedBuilder()
      .setTitle('🎫 Support')
      .setDescription('Clique sur le bouton ci-dessous pour ouvrir un ticket et contacter le staff.')
      .setColor(0x5865f2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('open_ticket').setLabel('Créer un ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫')
    );

    await panelChannel.send({ embeds: [embed], components: [row] });
    await interaction.reply(`✅ Panneau de tickets posté dans ${panelChannel}.`);
  },
};
