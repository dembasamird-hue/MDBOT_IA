# Bot Discord IA (Claude)

Un bot qui discute avec les membres de ton serveur en utilisant l'IA Claude. Répond quand on le mentionne, en DM, ou dans un salon dédié — avec mémoire de conversation.

## 1. Créer le bot sur Discord

1. Va sur https://discord.com/developers/applications → **New Application**.
2. Onglet **Bot** → **Reset Token** → copie le token (tu en auras besoin).
3. Toujours dans **Bot**, active **Message Content Intent** (obligatoire, sinon le bot ne lit pas les messages).
4. Onglet **OAuth2 > URL Generator** :
   - Scopes : `bot`
   - Permissions : `Send Messages`, `Read Message History`, `View Channels`
   - Copie le lien généré, ouvre-le, choisis ton serveur pour inviter le bot.

## 2. Récupérer une clé API Gemini (gratuite)

1. Va sur https://aistudio.google.com/apikey
2. Connecte-toi avec un compte Google → **Create API key**
3. Aucune carte bancaire requise. Attention : tant que tu ne payes pas, Google peut utiliser tes échanges pour améliorer ses modèles — évite d'y mettre des infos sensibles.
4. Les limites gratuites tournent autour de 10-15 requêtes/minute selon le modèle, ce qui est largement suffisant pour un bot de serveur perso.

## 3. Configuration locale

```bash
npm install
cp .env.example .env
# puis remplis .env avec ton DISCORD_TOKEN et ta GEMINI_API_KEY
npm start
```

## 4. Déployer sur Render (comme MDBOT)

1. Pousse ce dossier sur un repo GitHub.
2. Sur Render → **New > Web Service** → connecte le repo.
3. Build command : `npm install`
4. Start command : `npm start`
5. Ajoute les variables d'environnement (`DISCORD_TOKEN`, `GEMINI_API_KEY`, `GEMINI_MODEL`, etc.) dans l'onglet **Environment**.
6. Une fois déployé, copie l'URL Render et ajoute-la dans **UptimeRobot** (ping toutes les 5 min) pour éviter que le service ne s'endorme — exactement comme pour MDBOT.

## Personnaliser le comportement

- **`SYSTEM_PROMPT`** (dans `.env`) : change la personnalité du bot (ex: assistant de la communauté SAMIR D FILMS, expert science, modérateur sympa, etc.)
- **`ALLOWED_CHANNEL_ID`** : mets l'ID d'un salon si tu veux que le bot réponde à *tous* les messages de ce salon sans être mentionné.
- **`MAX_HISTORY`** (dans `index.js`) : nombre de messages gardés en mémoire par salon.
- **`GEMINI_MODEL`** : `gemini-3.1-flash-lite` si tu veux le plus rapide/économique, `gemini-3-flash` pour un bon équilibre qualité/vitesse.

## Fusionner avec MDBOT

Comme MDBOT tourne déjà sur Discord.js v14 + Render, tu peux copier le contenu du `messageCreate` de `index.js` directement dans ton bot existant plutôt que de déployer un second service — ça t'évite un abonnement Render en plus.
