const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  logChannelId: String,
  welcomeChannelId: String,
  welcomeMessage: { type: String, default: 'Bienvenue {user} sur **{server}** ! 🎉' },
  leaveChannelId: String,
  leaveMessage: { type: String, default: '{user} a quitté le serveur. 👋' },
  autoRoleId: String,
  ticketCategoryId: String,
  ticketLogChannelId: String,
  ticketStaffRoleId: String,
  tempVoiceChannelId: String,
  tempVoiceCategoryId: String,
  suggestionsChannelId: String,
});

const warningSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  reason: String,
  moderatorId: String,
  createdAt: { type: Date, default: Date.now },
});

const economySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  balance: { type: Number, default: 0 },
  lastDaily: Date,
  lastWork: Date,
});

const levelSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
});

const ticketSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  userId: { type: String, required: true },
  status: { type: String, default: 'open' },
  createdAt: { type: Date, default: Date.now },
});

const giveawaySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true },
  prize: String,
  winnerCount: { type: Number, default: 1 },
  endsAt: { type: Date, required: true },
  ended: { type: Boolean, default: false },
});

module.exports = {
  GuildConfig: mongoose.model('GuildConfig', guildConfigSchema),
  Warning: mongoose.model('Warning', warningSchema),
  Economy: mongoose.model('Economy', economySchema),
  Level: mongoose.model('Level', levelSchema),
  Ticket: mongoose.model('Ticket', ticketSchema),
  Giveaway: mongoose.model('Giveaway', giveawaySchema),
};
