const { SlashCommandBuilder } = require('discord.js');
const { Ticket } = require('../../database/schemas');
const { getConfig } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close-ticket')
    .setDescription('Fermer le ticket actuel'),
  async execute(interaction) {
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
  },
};
