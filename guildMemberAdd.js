const { getConfig } = require('../utils/helpers');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const config = await getConfig(member.guild.id);

    if (config.autoRoleId) {
      const role = member.guild.roles.cache.get(config.autoRoleId);
      if (role) await member.roles.add(role).catch(() => {});
    }

    if (config.welcomeChannelId) {
      const channel = member.guild.channels.cache.get(config.welcomeChannelId);
      if (channel) {
        const text = config.welcomeMessage
          .replace('{user}', `${member}`)
          .replace('{server}', member.guild.name);
        channel.send(text).catch(() => {});
      }
    }
  },
};
