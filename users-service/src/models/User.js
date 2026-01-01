const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema(
  { token: { type: String, required: true } },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },

    role: {
      type: String,
      enum: ['administrador', 'staff'],
      default: 'staff',
    },

    // REFERENCIA REAL
    sede: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sede',
      required: true,
    },

    tokens: { type: [TokenSchema], default: [] },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
