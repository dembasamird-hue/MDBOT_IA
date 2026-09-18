const { getConfig } = require('../utils/helpers');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    const config = await getConfig(member.guild.id);
    if (config.leaveChannelId) {
      const channel = member.guild.channels.cache.get(config.leaveChannelId);
      if (channel) {
        const text = config.leaveMessage
          .replace('{user}', member.user.tag)
          .replace('{server}', member.guild.name);
        channel.send(text).catch(() => {});
      }
    }
  },
};
