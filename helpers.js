const { GuildConfig, Economy, Level } = require('../database/schemas');

// Récupère (ou crée) la config d'un serveur
async function getConfig(guildId) {
  let config = await GuildConfig.findOne({ guildId });
  if (!config) config = await GuildConfig.create({ guildId });
  return config;
}

// Récupère (ou crée) le compte économie d'un membre
async function getEconomy(guildId, userId) {
  let account = await Economy.findOne({ guildId, userId });
  if (!account) account = await Economy.create({ guildId, userId, balance: 0 });
  return account;
}

// Récupère (ou crée) le niveau d'un membre
async function getLevel(guildId, userId) {
  let level = await Level.findOne({ guildId, userId });
  if (!level) level = await Level.create({ guildId, userId, xp: 0, level: 0 });
  return level;
}

// XP nécessaire pour atteindre un niveau donné
function xpForLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

module.exports = { getConfig, getEconomy, getLevel, xpForLevel };
