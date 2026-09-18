const { ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Ticket } = require('../database/schemas');
const { getConfig } = require('../utils/helpers');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // ---- Slash commands ----
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error('Erreur commande:', err);
        const reply = { content: '❌ Une erreur est survenue en exécutant cette commande.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(reply).catch(() => {});
        else await interaction.reply(reply).catch(() => {});
      }
      return;
    }

    // ---- Bouton "Créer un ticket" ----
    if (interaction.isButton() && interaction.customId === 'open_ticket') {
      const config = await getConfig(interaction.guild.id);
      if (!config.ticketCategoryId || !config.ticketStaffRoleId) {
        return interaction.reply({ content: '❌ Le système de tickets n\'est pas configuré (/setup-ticket).', ephemeral: true });
      }

      const existing = await Ticket.findOne({ guildId: interaction.guild.id, userId: interaction.user.id, status: 'open' });
      if (existing) {
        return interaction.reply({ content: `❌ Tu as déjà un ticket ouvert : <#${existing.channelId}>`, ephemeral: true });
      }

      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: config.ticketCategoryId,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: config.ticketStaffRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ],
      });

      await Ticket.create({ guildId: interaction.guild.id, channelId: channel.id, userId: interaction.user.id });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
      );

      await channel.send({
        content: `🎫 Bienvenue ${interaction.user} ! Le staff (<@&${config.ticketStaffRoleId}>) va te répondre bientôt.`,
        components: [row],
      });

      await interaction.reply({ content: `✅ Ton ticket a été créé : ${channel}`, ephemeral: true });
      return;
    }

    // ---- Bouton "Fermer le ticket" ----
    if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: 'open' });
      if (!ticket) return interaction.reply({ content: '❌ Ce salon n\'est pas un ticket ouvert.', ephemeral: true });

      ticket.status = 'closed';
      await ticket.save();

      const config = await getConfig(interaction.guild.id);
      if (config.ticketLogChannelId) {
        const logChannel = interaction.guild.channels.cache.get(config.ticketLogChannelId);
        if (logChannel) logChannel.send(`🔒 Ticket de <@${ticket.userId}> fermé par ${interaction.user.tag}.`).catch(() => {});
      }

      await interaction.reply('🔒 Ticket fermé. Ce salon va être supprimé dans 5 secondes...');
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  },
};
