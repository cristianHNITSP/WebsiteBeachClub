const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI no está definido en .env');
  }

  await mongoose.connect(uri);
  console.log(' [users-service] Conectado a MongoDB');
}

module.exports = { connectDB };
