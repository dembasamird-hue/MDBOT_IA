const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
require('dotenv').config();

// ==================== CONFIG GÉNÉRALE ====================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const ALLOWED_CHANNEL_ID = process.env.ALLOWED_CHANNEL_ID || null; // laisser vide = répond partout où il est mentionné
const MAX_HISTORY = 10; // nombre de messages gardés en mémoire par conversation

const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT ||
  `Tu es l'assistant IA du serveur Discord. Tu réponds en français, de façon naturelle, ` +
  `chaleureuse et concise (2-4 phrases en général, plus si on te demande des détails). ` +
  `Tu peux discuter de tout, aider, plaisanter, expliquer des choses. Reste toujours respectueux et sympa.`;

// ==================== CONFIG MODÉRATION ====================
const PREFIX = process.env.MOD_PREFIX || '!';
// Salon où le bot poste un rapport de chaque sanction (optionnel, laisser vide pour désactiver)
const MOD_LOG_CHANNEL_ID = process.env.MOD_LOG_CHANNEL_ID || null;

// Liste de mots interdits (en minuscules). Ajoute/retire ce que tu veux.
const BAD_WORDS = (process.env.BAD_WORDS || [
  'connard', 'enculé', 'pute', 'salope', 'batard', 'negre',
  'pd', 'pédé', 'nique ta mère', 'ntm', 'fdp',
].join(',')).split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);

// Liens autorisés malgré le filtre anti-lien (ex: liens YouTube, Twitter...)
const ALLOWED_LINK_DOMAINS = ['tenor.com', 'giphy.com', 'youtube.com', 'youtu.be'];

const MAX_MENTIONS = 5;      // au-delà -> spam de mentions
const CAPS_MIN_LENGTH = 10;  // message trop court n'est jamais compté comme "flood de majuscules"
const CAPS_RATIO = 0.7;      // 70% de majuscules ou plus = flood
const SPAM_WINDOW_MS = 6000; // fenêtre de temps
const SPAM_MAX_MESSAGES = 5; // nb de messages max dans la fenêtre avant que ce soit du spam

// ==================== CLIENT DISCORD ====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Channel],
});

// ==================== MÉMOIRE (conversation IA) ====================
// Historique de conversation par salon (Map<channelId, Array<{role, content}>>)
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

// ==================== APPEL API GEMINI ====================
async function askGemini(channelId, userMessage) {
  pushToHistory(channelId, 'user', userMessage);

  const contents = getHistory(channelId).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: { maxOutputTokens: 600 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Erreur API Gemini:', response.status, errText);
    throw new Error(`Erreur API Gemini (${response.status})`);
  }

  const data = await response.json();
  const reply = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('\n')
    .trim();

  if (!reply) throw new Error('Réponse vide de Gemini (peut-être bloquée par les filtres de sécurité)');

  pushToHistory(channelId, 'assistant', reply);
  return reply;
}

// Découpe un message trop long pour Discord (limite 2000 caractères)
function splitMessage(text, maxLength = 1900) {
  const chunks = [];
  let current = '';
  for (const line of text.split('\n')) {
    if ((current + '\n' + line).length > maxLength) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// ==================== MODÉRATION AUTOMATIQUE ====================
// Nombre d'avertissements par utilisateur (clé = "guildId-userId"). Remis à zéro si le bot redémarre.
const warnings = new Map();
// Historique des derniers messages par utilisateur pour détecter le spam
const spamTracker = new Map();

function warnKey(guildId, userId) {
  return `${guildId}-${userId}`;
}

function addWarning(guildId, userId) {
  const key = warnKey(guildId, userId);
  const count = (warnings.get(key) || 0) + 1;
  warnings.set(key, count);
  return count;
}

function containsBadWord(text) {
  const lower = text.toLowerCase();
  return BAD_WORDS.some((word) => word && lower.includes(word));
}

function containsBannedLink(text) {
  const urlRegex = /(https?:\/\/[^\s]+)|(discord\.gg\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  if (!matches) return false;
  return matches.some((url) => {
    const isAllowed = ALLOWED_LINK_DOMAINS.some((domain) => url.includes(domain));
    return !isAllowed;
  });
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
  const history = spamTracker.get(userId) || [];
  const recent = history.filter((t) => now - t < SPAM_WINDOW_MS);
  recent.push(now);
  spamTracker.set(userId, recent);
  return recent.length > SPAM_MAX_MESSAGES;
}

async function logModAction(guild, text) {
  if (!MOD_LOG_CHANNEL_ID) return;
  const channel = guild.channels.cache.get(MOD_LOG_CHANNEL_ID);
  if (channel) channel.send(text).catch(() => {});
}

// Applique une sanction croissante selon le nombre d'avertissements cumulés
async function punish(message, reason) {
  const { guild, member, author } = message;
  const count = addWarning(guild.id, author.id);

  await message.delete().catch(() => {});

  let actionText = `⚠️ Avertissement ${count} pour ${author.tag} — ${reason}`;

  try {
    if (count <= 2) {
      // 1er et 2e avertissement : juste un rappel
      await author.send(
        `⚠️ Ton message a été supprimé sur **${guild.name}** (${reason}). ` +
        `Avertissement ${count}/5 — continue et une sanction plus forte s'appliquera.`
      ).catch(() => {});
    } else if (count === 3 || count === 4) {
      // 3e/4e : mise en sourdine temporaire (timeout)
      const durationMs = count === 3 ? 10 * 60 * 1000 : 60 * 60 * 1000; // 10 min puis 1h
      await member.timeout(durationMs, reason).catch(() => {});
      actionText += ` → 🔇 Timeout ${count === 3 ? '10 min' : '1h'}`;
      await author.send(
        `🔇 Tu as été mis en sourdine sur **${guild.name}** (${reason}). Avertissement ${count}/5.`
      ).catch(() => {});
    } else {
      // 5e et plus : expulsion
      await author.send(`🚪 Tu as été expulsé de **${guild.name}** (${reason}, trop d'avertissements).`).catch(() => {});
      await member.kick(reason).catch(() => {});
      actionText += ` → 🚪 Kick`;
      warnings.delete(warnKey(guild.id, author.id));
    }
  } catch (err) {
    console.error('Erreur lors de la sanction:', err);
  }

  console.log(actionText);
  await logModAction(guild, actionText);
}

// Retourne true si le message a été traité par l'auto-modération (et donc supprimé)
async function runAutoMod(message) {
  if (!message.guild) return false;
  if (message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) return false; // les modérateurs ne sont pas filtrés

  const content = message.content;

  if (containsBadWord(content)) {
    await punish(message, 'langage inapproprié');
    return true;
  }
  if (containsBannedLink(content)) {
    await punish(message, 'lien non autorisé');
    return true;
  }
  if (hasTooManyMentions(message)) {
    await punish(message, 'spam de mentions');
    return true;
  }
  if (isExcessiveCaps(content)) {
    await punish(message, 'abus de majuscules');
    return true;
  }
  if (isSpamming(message.author.id)) {
    await punish(message, 'spam de messages');
    return true;
  }

  return false;
}

// ==================== COMMANDES DE MODÉRATION MANUELLES ====================
// Utilisation : !warn @user raison | !clear 10 | !mute @user 10 | !unmute @user | !kick @user raison | !ban @user raison | !warnings @user
async function handleModCommand(message) {
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();
  const { guild, member } = message;

  const perms = member.permissions;

  if (command === 'clear' || command === 'purge') {
    if (!perms.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply('❌ Tu n\'as pas la permission de faire ça.');
    }
    const amount = parseInt(args[0], 10);
    if (!amount || amount < 1 || amount > 100) {
      return message.reply('Utilisation : `!clear 10` (entre 1 et 100 messages)');
    }
    await message.channel.bulkDelete(amount + 1, true).catch(() => {});
    const confirmation = await message.channel.send(`🧹 ${amount} messages supprimés.`);
    setTimeout(() => confirmation.delete().catch(() => {}), 4000);
    return;
  }

  const target = message.mentions.members?.first();

  if (command === 'warn') {
    if (!perms.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply('❌ Tu n\'as pas la permission de faire ça.');
    }
    if (!target) return message.reply('Utilisation : `!warn @membre raison`');
    const reason = args.slice(1).join(' ') || 'aucune raison fournie';
    const count = addWarning(guild.id, target.id);
    await target.send(`⚠️ Tu as reçu un avertissement sur **${guild.name}** : ${reason} (avertissement ${count}/5)`).catch(() => {});
    return message.reply(`✅ ${target.user.tag} averti (${count}/5) — ${reason}`);
  }

  if (command === 'warnings') {
    if (!target) return message.reply('Utilisation : `!warnings @membre`');
    const count = warnings.get(warnKey(guild.id, target.id)) || 0;
    return message.reply(`${target.user.tag} a **${count}** avertissement(s).`);
  }

  if (command === 'mute') {
    if (!perms.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply('❌ Tu n\'as pas la permission de faire ça.');
    }
    if (!target) return message.reply('Utilisation : `!mute @membre [minutes]`');
    const minutes = parseInt(args[1], 10) || 10;
    await target.timeout(minutes * 60 * 1000, `Mute manuel par ${message.author.tag}`).catch(() => {});
    return message.reply(`🔇 ${target.user.tag} mis en sourdine pour ${minutes} min.`);
  }

  if (command === 'unmute') {
    if (!perms.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply('❌ Tu n\'as pas la permission de faire ça.');
    }
    if (!target) return message.reply('Utilisation : `!unmute @membre`');
    await target.timeout(null).catch(() => {});
    return message.reply(`🔊 ${target.user.tag} n'est plus en sourdine.`);
  }

  if (command === 'kick') {
    if (!perms.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply('❌ Tu n\'as pas la permission de faire ça.');
    }
    if (!target) return message.reply('Utilisation : `!kick @membre raison`');
    const reason = args.slice(1).join(' ') || 'aucune raison fournie';
    await target.send(`🚪 Tu as été expulsé de **${guild.name}** : ${reason}`).catch(() => {});
    await target.kick(reason).catch(() => {});
    return message.reply(`✅ ${target.user.tag} expulsé — ${reason}`);
  }

  if (command === 'ban') {
    if (!perms.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply('❌ Tu n\'as pas la permission de faire ça.');
    }
    if (!target) return message.reply('Utilisation : `!ban @membre raison`');
    const reason = args.slice(1).join(' ') || 'aucune raison fournie';
    await target.send(`🔨 Tu as été banni de **${guild.name}** : ${reason}`).catch(() => {});
    await target.ban({ reason }).catch(() => {});
    return message.reply(`✅ ${target.user.tag} banni — ${reason}`);
  }

  if (command === 'modhelp') {
    return message.reply(
      `**Commandes de modération**\n` +
      `\`${PREFIX}warn @membre raison\` — avertir\n` +
      `\`${PREFIX}warnings @membre\` — voir ses avertissements\n` +
      `\`${PREFIX}mute @membre [minutes]\` — mise en sourdine\n` +
      `\`${PREFIX}unmute @membre\` — retirer la sourdine\n` +
      `\`${PREFIX}kick @membre raison\` — expulser\n` +
      `\`${PREFIX}ban @membre raison\` — bannir\n` +
      `\`${PREFIX}clear [1-100]\` — supprimer des messages`
    );
  }
}

// ==================== EVENEMENTS ====================
client.once('ready', () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;

    // 1. Modération automatique (insultes, spam, liens, majuscules, mentions)
    const wasModerated = await runAutoMod(message);
    if (wasModerated) return;

    // 2. Commandes de modération manuelles (!warn, !kick, !ban, !clear...)
    if (message.guild && message.content.startsWith(PREFIX)) {
      await handleModCommand(message);
      return;
    }

    console.log(`📩 Message reçu de ${message.author.username} dans #${message.channel.name || 'DM'} : "${message.content}"`);

    const isDM = message.channel.type === 1; // DM
    const isMentioned = message.mentions.has(client.user);
    const isReplyToBot =
      message.reference &&
      (await message.channel.messages.fetch(message.reference.messageId).catch(() => null))
        ?.author.id === client.user.id;

    const inAllowedChannel =
      !ALLOWED_CHANNEL_ID || message.channel.id === ALLOWED_CHANNEL_ID;

    const shouldRespond =
      isDM || isMentioned || isReplyToBot || (ALLOWED_CHANNEL_ID && inAllowedChannel);

    if (!shouldRespond) {
      console.log('⏭️ Message ignoré (pas de mention/DM/réponse au bot).');
      return;
    }
    if (ALLOWED_CHANNEL_ID && !inAllowedChannel && !isDM) return;

    const cleanContent = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!cleanContent) return;

    console.log('🤖 Appel à Gemini avec :', cleanContent);
    await message.channel.sendTyping();

    const reply = await askGemini(message.channel.id, cleanContent);
    console.log('✅ Réponse de Gemini reçue :', reply.slice(0, 100));

    const chunks = splitMessage(reply);
    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  } catch (err) {
    console.error('Erreur:', err);
    message.reply("Oups, j'ai eu un souci pour répondre 😅 réessaie dans un instant.").catch(() => {});
  }
});

// ==================== KEEP-ALIVE (pour Render + UptimeRobot) ====================
const http = require('http');
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot IA en ligne ✅');
  })
  .listen(PORT, () => console.log(`🌐 Serveur keep-alive sur le port ${PORT}`));

client.login(DISCORD_TOKEN);
