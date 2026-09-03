const { Client, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();

// ==================== CONFIG ====================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash';
const ALLOWED_CHANNEL_ID = process.env.ALLOWED_CHANNEL_ID || null; // laisser vide = répond partout où il est mentionné
const MAX_HISTORY = 10; // nombre de messages gardés en mémoire par conversation

const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT ||
  `Tu es l'assistant IA du serveur Discord. Tu réponds en français, de façon naturelle, ` +
  `chaleureuse et concise (2-4 phrases en général, plus si on te demande des détails). ` +
  `Tu peux discuter de tout, aider, plaisanter, expliquer des choses. Reste toujours respectueux et sympa.`;

// ==================== CLIENT DISCORD ====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

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

  // Gemini attend un format "contents" avec role user/model et des "parts"
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

// ==================== EVENEMENTS ====================
client.once('ready', () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;

    console.log(`📩 Message reçu de ${message.author.username} dans #${message.channel.name || 'DM'} : "${message.content}"`);

    const isDM = message.channel.type === 1; // DM
    const isMentioned = message.mentions.has(client.user);
    const isReplyToBot =
      message.reference &&
      (await message.channel.messages.fetch(message.reference.messageId).catch(() => null))
        ?.author.id === client.user.id;

    const inAllowedChannel =
      !ALLOWED_CHANNEL_ID || message.channel.id === ALLOWED_CHANNEL_ID;

    // Le bot répond si : mentionné, en DM, réponse à un de ses messages,
    // OU si un salon dédié est configuré et qu'on y écrit sans avoir besoin de le mentionner.
    const shouldRespond =
      isDM || isMentioned || isReplyToBot || (ALLOWED_CHANNEL_ID && inAllowedChannel);

    if (!shouldRespond) {
      console.log('⏭️ Message ignoré (pas de mention/DM/réponse au bot).');
      return;
    }
    if (ALLOWED_CHANNEL_ID && !inAllowedChannel && !isDM) return;

    // Nettoyer le texte (enlever la mention @bot)
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
// Petit serveur HTTP pour que UptimeRobot puisse "ping" le bot et le garder éveillé,
// exactement comme pour MDBOT.
const http = require('http');
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot IA en ligne ✅');
  })
  .listen(PORT, () => console.log(`🌐 Serveur keep-alive sur le port ${PORT}`));

client.login(DISCORD_TOKEN);
