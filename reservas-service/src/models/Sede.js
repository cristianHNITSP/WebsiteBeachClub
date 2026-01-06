const mongoose = require('mongoose');

const SedeSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true, // 'casa-frida', 'cabanas-frida' o 'casa_frida'
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true, // 'Casa Frida'
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // opcional pero MUY útil
    location: {
      city: String,
      state: String,
      country: { type: String, default: 'México' },
    },
  },
  { timestamps: true }
);

// helper opcional
SedeSchema.statics.findByKey = function (key) {
  if (!key) return null;
  return this.findOne({ key }).exec();
};

module.exports = mongoose.model('Sede', SedeSchema);
