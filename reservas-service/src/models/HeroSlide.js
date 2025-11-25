// src/models/HeroSlide.js
const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    subtitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    img: {
      type: String,
      required: true,
      trim: true,
    },
    // opcional: texto del chip superior (ej. "Reservas directas · Mejor atención")
    badgeText: {
      type: String,
      trim: true,
      default: 'Reservas directas · Mejor atención',
    },
    // opcional: si quieres un CTA en el hero
    ctaLabel: {
      type: String,
      trim: true,
    },
    ctaHref: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('HeroSlide', heroSlideSchema);
