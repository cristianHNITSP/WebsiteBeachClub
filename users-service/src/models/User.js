// models/User.js
const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true }
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['administrador', 'staff'], default: 'staff' }, // 👈 clave que matchea con Role.key
    tokens: { type: [TokenSchema], default: [] },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },

    // 👇 NUEVO: sede a la que pertenece el usuario
    // clave técnica: 'casa-frida' | 'cabanas-frida'
    sede: {
      type: String,
      enum: ['casa-frida', 'cabanas-frida'],
      default: 'casa-frida',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
