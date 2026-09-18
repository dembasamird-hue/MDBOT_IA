const { PermissionsBitField } = require('discord.js');
const { getLevel, xpForLevel } = require('../utils/helpers');
const { Warning } = require('../database/schemas');

// ==================== CONFIG AUTOMOD ====================
const BAD_WORDS = (process.env.BAD_WORDS || [
  'connard', 'enculé', 'pute', 'salope', 'batard', 'negre',
  'pd', 'pédé', 'nique ta mère', 'ntm', 'fdp',
].join(',')).split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);

const ALLOWED_LINK_DOMAINS = ['tenor.com', 'giphy.com', 'youtube.com', 'youtu.be'];
const MAX_MENTIONS = 5;
const CAPS_MIN_LENGTH = 10;
const CAPS_RATIO = 0.7;
const SPAM_WINDOW_MS = 6000;
const SPAM_MAX_MESSAGES = 5;
const MOD_LOG_CHANNEL_ID = process.env.MOD_LOG_CHANNEL_ID || null;

const spamTracker = new Map();
const xpCooldown = new Map(); // anti-spam XP (pas besoin de persister)

function containsBadWord(text) {
  const lower = text.toLowerCase();
  return BAD_WORDS.some((word) => word && lower.includes(word));
}
function containsBannedLink(text) {
  const matches = text.match(/(https?:\/\/[^\s]+)|(discord\.gg\/[^\s]+)/gi);
  if (!matches) return false;
  return matches.some((url) => !ALLOWED_LINK_DOMAINS.some((domain) => url.includes(domain)));
}
function isExcessiveCaps(text) {
  const letters = text.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (letters.length < CAPS_MIN_LENGTH) return false;
  const upper = letters.replace(/[^A-ZÀ-Ý]/g, '');
  return upper.length / letters.length >= CAPS_RATIO;
}
function hasTooManyMentions(message) {
  return message.mentions.users.size + message.mentions.roles.size > MAX_MENTIONS;
}
function isSpamming(userId) {
  const now = Date.now();
  const history = (spamTracker.get(userId) || []).filter((t) => now - t < SPAM_WINDOW_MS);
  history.push(now);
  spamTracker.set(userId, history);
  return history.length > SPAM_MAX_MESSAGES;
}
async function logModAction(guild, text) {
  if (!MOD_LOG_CHANNEL_ID) return;
  const channel = guild.channels.cache.get(MOD_LOG_CHANNEL_ID);
  if (channel) channel.send(text).catch(() => {});
}

async function punish(message, reason) {
  const { guild, member, author } = message;
  await Warning.create({ guildId: guild.id, userId: author.id, reason, moderatorId: 'AUTOMOD' });
  const count = await Warning.countDocuments({ guildId: guild.id, userId: author.id });

  await message.delete().catch(() => {});
  let actionText = `⚠️ Avertissement ${count} pour ${author.tag} — ${reason}`;

  try {
    if (count <= 2) {
      await author.send(`⚠️ Ton message a été supprimé sur **${guild.name}** (${reason}). Avertissement ${count}/5.`).catch(() => {});
    } else if (count === 3 || count === 4) {
      const durationMs = count === 3 ? 10 * 60 * 1000 : 60 * 60 * 1000;
      await member.timeout(durationMs, reason).catch(() => {});
      actionText += ` → 🔇 Timeout ${count === 3 ? '10 min' : '1h'}`;
      await author.send(`🔇 Tu as été mis en sourdine sur **${guild.name}** (${reason}). Avertissement ${count}/5.`).catch(() => {});
    } else {
      await author.send(`🚪 Tu as été expulsé de **${guild.name}** (${reason}, trop d'avertissements).`).catch(() => {});
      await member.kick(reason).catch(() => {});
      actionText += ` → 🚪 Kick`;
    }
  } catch (err) {
    console.error('Erreur lors de la sanction:', err);
  }

  console.log(actionText);
  await logModAction(guild, actionText);
}

async function runAutoMod(message) {
  if (!message.guild) return false;
  if (message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) return false;

  const content = message.content;
  if (containsBadWord(content)) { await punish(message, 'langage inapproprié'); return true; }
  if (containsBannedLink(content)) { await punish(message, 'lien non autorisé'); return true; }
  if (hasTooManyMentions(message)) { await punish(message, 'spam de mentions'); return true; }
  if (isExcessiveCaps(content)) { await punish(message, 'abus de majuscules'); return true; }
  if (isSpamming(message.author.id)) { await punish(message, 'spam de messages'); return true; }
  return false;
}

// ==================== XP / NIVEAUX ====================
async function handleXP(message) {
  const key = `${message.guild.id}-${message.author.id}`;
  const now = Date.now();
  if (xpCooldown.get(key) && now - xpCooldown.get(key) < 60000) return;
  xpCooldown.set(key, now);

  const level = await getLevel(message.guild.id, message.author.id);
  level.xp += Math.floor(Math.random() * 11) + 15; // 15-25 XP

  const needed = xpForLevel(level.level + 1);
  if (level.xp >= needed) {
    level.level += 1;
    message.channel.send(`🎉 GG ${message.author} tu passes **niveau ${level.level}** !`).catch(() => {});
  }
  await level.save();
}

// ==================== CHAT IA (GEMINI) ====================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const ALLOWED_CHANNEL_ID = process.env.ALLOWED_CHANNEL_ID || null;
const MAX_HISTORY = 10;
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT ||
  `Tu es l'assistant IA du serveur Discord. Tu réponds en français, de façon naturelle, chaleureuse et concise. Reste toujours respectueux et sympa.`;

const conversations = new Map();
function getHistory(channelId) {
  if (!conversations.has(channelId)) conversations.set(channelId, []);
  return conversations.get(channelId);
}
function pushToHistory(channelId, role, content) {
  const history = getHistory(channelId);
  history.push({ role, content });
  while (history.length > MAX_HISTORY) history.shift();
}
async function askGemini(channelId, userMessage) {
  pushToHistory(channelId, 'user', userMessage);
  const contents = getHistory(channelId).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, generationConfig: { maxOutputTokens: 600 } }),
  });
  if (!response.ok) throw new Error(`Erreur API Gemini (${response.status})`);
  const data = await response.json();
  const reply = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('\n').trim();
  if (!reply) throw new Error('Réponse vide de Gemini');
  pushToHistory(channelId, 'assistant', reply);
  return reply;
}
function splitMessage(text, maxLength = 1900) {
  const chunks = [];
  let current = '';
  for (const line of text.split('\n')) {
    if ((current + '\n' + line).length > maxLength) { chunks.push(current); current = line; }
    else current = current ? current + '\n' + line : line;
  }
  if (current) chunks.push(current);
  return chunks;
}

// ==================== ÉVÉNEMENT PRINCIPAL ====================
module.exports = {
  name: 'messageCreate',
  async execute(message) {
    try {
      if (message.author.bot) return;

      if (message.guild) {
        const wasModerated = await runAutoMod(message);
        if (wasModerated) return;

        await handleXP(message).catch((e) => console.error('Erreur XP:', e));
      }

      const isDM = message.channel.type === 1;
      const isMentioned = message.mentions.has(message.client.user);
      const isReplyToBot =
        message.reference &&
        (await message.channel.messages.fetch(message.reference.messageId).catch(() => null))?.author.id === message.client.user.id;
      const inAllowedChannel = !ALLOWED_CHANNEL_ID || message.channel.id === ALLOWED_CHANNEL_ID;
      const shouldRespond = isDM || isMentioned || isReplyToBot || (ALLOWED_CHANNEL_ID && inAllowedChannel);

      if (!shouldRespond) return;
      if (ALLOWED_CHANNEL_ID && !inAllowedChannel && !isDM) return;

      const cleanContent = message.content.replace(/<@!?\d+>/g, '').trim();
      if (!cleanContent) return;

      await message.channel.sendTyping();
      const reply = await askGemini(message.channel.id, cleanContent);
      for (const chunk of splitMessage(reply)) await message.reply(chunk);
    } catch (err) {
      console.error('Erreur messageCreate:', err);
      message.reply("Oups, j'ai eu un souci 😅 réessaie dans un instant.").catch(() => {});
    }
  },
};
