const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI manquant dans les variables d\'environnement.');
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log('🗄️  Connecté à MongoDB');
  } catch (err) {
    console.error('❌ Erreur de connexion MongoDB:', err.message);
  }
}

module.exports = { connectDB };
