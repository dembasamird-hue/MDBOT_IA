# Bot Discord complet

Bot tout-en-un : chat IA, modération automatique + manuelle, logs, bienvenue/départ, rôle auto, tickets, niveaux/XP, économie, sondages, suggestions, giveaways, salons vocaux temporaires, et système de MP staff (`/mp`, `/mpall`). Tout se configure directement depuis Discord avec des commandes `/`.

## 1. Créer le bot sur Discord

1. https://discord.com/developers/applications → **New Application**
2. Onglet **Bot** → **Reset Token** → copie-le (tu en auras besoin)
3. Toujours dans **Bot**, active les 3 toggles suivants (obligatoires) :
   - **Message Content Intent**
   - **Server Members Intent** (nécessaire pour `/mpall` et le rôle automatique)
   - **Presence Intent** (optionnel mais recommandé)
4. Onglet **General Information** → copie l'**Application ID** (c'est ton `CLIENT_ID`)
5. Onglet **OAuth2 > URL Generator** :
   - Scopes : `bot`, `applications.commands`
   - Permissions : **Administrator** (le plus simple vu le nombre de fonctionnalités — sinon il faut cocher manuellement Manage Messages, Kick/Ban Members, Moderate Members, Manage Channels, Manage Roles, Send Messages, etc.)
   - Copie le lien, ouvre-le, invite le bot sur ton serveur

## 2. Créer une base de données gratuite (MongoDB Atlas)

Le bot a besoin d'une vraie base de données pour que les avertissements, niveaux, économie et configs ne disparaissent pas à chaque redémarrage.

1. Va sur https://cloud.mongodb.com → crée un compte gratuit (aucune carte bancaire requise)
2. **Build a Database** → choisis **M0 Free**
3. Crée un utilisateur (nom + mot de passe) — garde-les de côté
4. Dans **Network Access**, ajoute `0.0.0.0/0` (autoriser toutes les IP — nécessaire car Render change d'IP)
5. Dans **Database > Connect > Drivers**, copie l'URI de connexion, il ressemble à :
   `mongodb+srv://utilisateur:motdepasse@cluster0.xxxxx.mongodb.net/discordbot`
   Remplace `motdepasse` par ton vrai mot de passe.

## 3. Récupérer la clé Gemini (gratuite)

https://aistudio.google.com/apikey → connecte-toi avec Google → **Create API key**

## 4. Configuration

```bash
npm install
cp .env.example .env
# remplis .env avec DISCORD_TOKEN, CLIENT_ID, GEMINI_API_KEY, MONGODB_URI
npm run deploy   # enregistre les commandes / auprès de Discord (à refaire à chaque ajout de commande)
npm start
```

## 5. Déployer sur Render

1. Pousse tout le dossier sur GitHub (comme pour la version précédente)
2. Render → **New > Web Service** → connecte le repo
3. **Runtime** : Node
4. **Build Command** : `npm install`
5. **Start Command** : `npm start`
6. Variables d'environnement à ajouter (**Environment**) : `DISCORD_TOKEN`, `CLIENT_ID`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `MONGODB_URI`
7. Une fois déployé, ouvre le **Shell** de Render (menu de gauche) et lance une fois :
   ```
   node deploy-commands.js
   ```
   Ça enregistre toutes les commandes `/` auprès de Discord (nécessaire une seule fois, ou après ajout d'une nouvelle commande).
8. Ajoute l'URL Render dans **UptimeRobot** (ping toutes les 5 min) comme avant, pour éviter que le service ne s'endorme.

## Liste des commandes

### Modération
- `/ban @membre [raison]`
- `/kick @membre [raison]`
- `/timeout @membre <minutes> [raison]` (0 minute = retirer le timeout)
- `/warn @membre <raison>`
- `/warnings @membre`
- `/clear <nombre>`

### Configuration (réservé Manage Server)
- `/setup-logs #salon`
- `/setup-welcome #salon [message]`
- `/setup-leave #salon [message]`
- `/setup-autorole @role`
- `/setup-tempvoice #salon-vocal`
- `/setup-ticket #categorie @role-staff #salon-panel [#salon-logs]`

### Tickets
- Bouton "Créer un ticket" posté par `/setup-ticket`
- `/close-ticket` ou le bouton "Fermer le ticket" dans le salon

### Niveaux
- `/rank [@membre]`
- `/leaderboard`

### Économie
- `/balance [@membre]`
- `/daily`
- `/work`
- `/pay @membre <montant>`
- `/richest`

### Communauté
- `/poll <question> <option1> <option2> [option3] [option4]`
- `/suggest <texte>`
- `/giveaway <prix> <durée_minutes> <gagnants>` (réservé staff)

### Staff
- `/mp @membre <message>` — MP individuel au nom du serveur
- `/mpall <message>` — MP à tous les membres (réservé Administrateur, peut prendre du temps sur un gros serveur)

## Comportement automatique

- **Chat IA** : répond quand on le mentionne, en DM, ou en réponse à un de ses messages
- **Auto-modération** : supprime automatiquement insultes, liens non autorisés, spam de mentions, flood de majuscules, spam de messages — avec avertissements progressifs (1-2 = DM, 3 = timeout 10 min, 4 = timeout 1h, 5+ = kick)
- **XP** : chaque message donne 15-25 XP (cooldown 60s), annonce en salon au passage de niveau
- **Bienvenue/départ** : message automatique + rôle auto si configurés
- **Salons vocaux temporaires** : rejoindre le salon configuré crée un salon perso, supprimé quand il se vide
- **Giveaways** : se terminent automatiquement à l'heure prévue, gagnant(s) tiré(s) parmi les réactions 🎉

## Notes importantes

- Les anciens fichiers (`index.js` en un seul bloc, commandes `!`) sont remplacés par cette version en plusieurs fichiers avec des commandes `/`. Ne mélange pas les deux.
- Si tu ajoutes ou modifies une commande, il faut relancer `node deploy-commands.js` (en local ou via le Shell Render) pour que Discord la reconnaisse.
- `Server Members Intent` doit être activé sur le Developer Portal, sinon `/mpall` et le rôle automatique ne fonctionneront pas.
