const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const { connectDB } = require('./database/connect');
const { Giveaway } = require('./database/schemas');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

// ==================== CHARGEMENT DES COMMANDES ====================
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const folder of fs.readdirSync(commandsPath)) {
  const folderPath = path.join(commandsPath, folder);
  for (const file of fs.readdirSync(folderPath).filter((f) => f.endsWith('.js'))) {
    const command = require(path.join(folderPath, file));
    if (command.data && command.execute) client.commands.set(command.data.name, command);
  }
}
console.log(`📦 ${client.commands.size} commandes chargées.`);

// ==================== CHARGEMENT DES ÉVÉNEMENTS ====================
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
}

// ==================== VÉRIFICATION DES GIVEAWAYS ====================
setInterval(async () => {
  const finished = await Giveaway.find({ ended: false, endsAt: { $lte: new Date() } });
  for (const giveaway of finished) {
    giveaway.ended = true;
    await giveaway.save();

    try {
      const channel = await client.channels.fetch(giveaway.channelId);
      const message = await channel.messages.fetch(giveaway.messageId);
      const reaction = message.reactions.cache.get('🎉');
      const users = reaction ? (await reaction.users.fetch()).filter((u) => !u.bot) : new Map();

      if (users.size === 0) {
        await channel.send(`😢 Personne n'a participé au giveaway pour **${giveaway.prize}**.`);
        continue;
      }

      const winners = [...users.values()].sort(() => Math.random() - 0.5).slice(0, giveaway.winnerCount);
      const embed = new EmbedBuilder()
        .setTitle('🎉 Giveaway terminé !')
        .setDescription(`**Prix :** ${giveaway.prize}\n**Gagnant(s) :** ${winners.map((w) => `${w}`).join(', ')}`)
        .setColor(0xf47fff);

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur fin de giveaway:', err);
    }
  }
}, 30 * 1000);

// ==================== KEEP-ALIVE (Render + UptimeRobot) ====================
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot en ligne ✅');
  })
  .listen(PORT, () => console.log(`🌐 Serveur keep-alive sur le port ${PORT}`));

// ==================== DÉMARRAGE ====================
connectDB();
client.login(process.env.DISCORD_TOKEN);
