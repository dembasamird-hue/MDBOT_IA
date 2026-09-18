const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Créer un sondage')
    .addStringOption((o) => o.setName('question').setDescription('La question du sondage').setRequired(true))
    .addStringOption((o) => o.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption((o) => o.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption((o) => o.setName('option3').setDescription('Option 3'))
    .addStringOption((o) => o.setName('option4').setDescription('Option 4')),
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const options = [1, 2, 3, 4]
      .map((n) => interaction.options.getString(`option${n}`))
      .filter(Boolean);

    const description = options.map((opt, i) => `${NUMBER_EMOJIS[i]} ${opt}`).join('\n');
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${question}`)
      .setDescription(description)
      .setColor(0x5865f2)
      .setFooter({ text: `Sondage lancé par ${interaction.user.username}` });

    await interaction.reply({ embeds: [embed] });
    const message = await interaction.fetchReply();
    for (let i = 0; i < options.length; i++) await message.react(NUMBER_EMOJIS[i]);
  },
};
