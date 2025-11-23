require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { connectDB } = require('../config/db');
const User = require('../models/User');

async function seed() {
  try {
    await connectDB();

    console.log('📝 Borrando usuarios existentes...');
    await User.deleteMany({});

    const passwordAdmin = await bcrypt.hash('admin1234', 10);
    const passwordStaff = await bcrypt.hash('staff1234', 10);

    const users = await User.insertMany([
      {
        name: 'Administrador BeachClub',
        email: 'admin@beachclub.com',
        password: passwordAdmin,
        role: 'admin',
        isActive: true
      },
      {
        name: 'Recepcionista',
        email: 'recepcion@beachclub.com',
        password: passwordStaff,
        role: 'staff',
        isActive: true
      }
    ]);

    console.log('✅ Usuarios creados:', users.map(u => u.email));
  } catch (err) {
    console.error('❌ Error en seed-users:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
