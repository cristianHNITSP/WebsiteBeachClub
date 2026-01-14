const mongoose = require('mongoose');
const Sede = require('../models/Sede');

require('dotenv').config();

if (process.env.SEED !== 'true') {
  console.log('SEED not enabled — skipping users-service seed-sedes.js');
  process.exit(0);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const sedes = [
    {
      key: 'casa-frida',
      name: 'Casa Frida',
      description: 'Casa boutique frente al mar',
    },
    {
      key: 'cabanas-frida',
      name: 'Cabañas Frida',
      description: 'Complejo de cabañas boutique',
    },
  ];

  for (const s of sedes) {
    await Sede.updateOne(
      { key: s.key },
      { $setOnInsert: s },
      { upsert: true }
    );
  }

  console.log('Sedes inicializadas');
  process.exit(0);
})();
