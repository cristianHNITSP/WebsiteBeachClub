// models/Role.js
const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,     // 'admin', 'staff', etc.
      trim: true,
    },
    name: {
      type: String,
      required: true,   // Nombre legible: "Administrador", "Recepcionista"
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // Lista de permisos de alto nivel
    permissions: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', RoleSchema);
