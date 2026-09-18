const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLevel, xpForLevel } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Voir ton niveau et ton XP')
    .addUserOption((o) => o.setName('membre').setDescription('Voir le niveau d\'un autre membre')),
  async execute(interaction) {
    const target = interaction.options.getUser('membre') || interaction.user;
    const data = await getLevel(interaction.guild.id, target.id);
    const needed = xpForLevel(data.level + 1);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Niveau de ${target.username}`)
      .addFields(
        { name: 'Niveau', value: `${data.level}`, inline: true },
        { name: 'XP', value: `${data.xp} / ${needed}`, inline: true }
      )
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x5865f2);

    await interaction.reply({ embeds: [embed] });
  },
};
