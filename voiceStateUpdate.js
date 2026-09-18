const { ChannelType } = require('discord.js');
const { getConfig } = require('../utils/helpers');

// Suit les salons temporaires créés (pour les supprimer une fois vides)
const tempChannels = new Set();

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const guild = newState.guild;
    const config = await getConfig(guild.id);

    // Un membre rejoint le salon "Créer un salon"
    if (newState.channelId && newState.channelId === config.tempVoiceChannelId) {
      const channel = await guild.channels.create({
        name: `🔊 Salon de ${newState.member.displayName}`,
        type: ChannelType.GuildVoice,
        parent: config.tempVoiceCategoryId || undefined,
      });
      tempChannels.add(channel.id);
      await newState.setChannel(channel).catch(() => {});
    }

    // Un salon temporaire devient vide -> on le supprime
    if (oldState.channelId && tempChannels.has(oldState.channelId)) {
      const channel = guild.channels.cache.get(oldState.channelId);
      if (channel && channel.members.size === 0) {
        tempChannels.delete(oldState.channelId);
        await channel.delete().catch(() => {});
      }
    }
  },
};
