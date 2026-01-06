// src/models/Habitacion.js
const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =========================
   OFFER
   ========================= */

const OfferSchema = new Schema(
  {
    isSpecial: { type: Boolean, default: false },
    description: { type: String, default: "" },
    // ej. 10 = 10%
    discountPercent: { type: Number, default: null, min: 1, max: 99 },
  },
  { _id: false }
);

/* =========================
   INVENTORY STATES
   ========================= */

const INVENTORY_STATES = [
  "Activa",
  "Mantenimiento",
  "Fuera de servicio",
  "Bloqueada",
];

/* =========================
   RATING desde favoritos
   ========================= */

// cuántos favoritos equivalen aprox. a 5 estrellas
const FAVORITES_FOR_FIVE_STARS = 25;

/**
 * Calcula rating (0–5) a partir de favoritesCount.
 * - 0 favoritos => 0 estrellas
 * - FAVORITES_FOR_FIVE_STARS favoritos o más => 5 estrellas
 * - Entre medio: escala lineal, redondeo a 1 decimal
 */
function computeRatingFromFavorites(favoritesCount) {
  const fav = Number(favoritesCount) || 0;
  if (fav <= 0) return 0;

  const raw = (fav / FAVORITES_FOR_FIVE_STARS) * 5;
  const clamped = Math.min(5, Math.max(0, raw));
  return Math.round(clamped * 10) / 10;
}

/* =========================
   SCHEMA PRINCIPAL
   ========================= */

const HabitacionSchema = new Schema(
  {
    // Código lógico único (CF-103, CB-02, etc.)
    codigo: { type: String, required: true, unique: true, trim: true },

    // Legacy: hotelCode (casa_frida, cabanas_fridas, etc.)
    hotelCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Nuevo modelo basado en Sede
    sedeId: {
      type: Schema.Types.ObjectId,
      ref: "Sede",
      index: true,
      default: null,
    },
    // Clave de la sede (normalizada, ej: "casa_frida")
    sedeKey: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },

    // Número físico de puerta
    roomNumber: { type: String, required: true, trim: true },

    // Datos visibles
    title: { type: String, required: true, trim: true },
    roomType: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    img: { type: String, default: "", trim: true },

    // Tarifa base
    price: { type: Number, required: true, min: 0 },

    // Rating calculado desde favoritos
    rating: { type: Number, default: 0, min: 0, max: 5 },

    amenities: { type: [String], default: [] },
    badge: { type: String, default: "", trim: true },
    featured: { type: Boolean, default: false },

    // Capacidad (cantidad de adultos, etc.)
    size: { type: Number, default: null },

    // Estado de inventario
    inventoryStatus: {
      type: String,
      default: "Activa",
      enum: INVENTORY_STATES,
      index: true,
    },

    // Oferta especial
    offer: { type: OfferSchema, default: () => ({}) },

    // ❤️ Favoritos
    favoritesCount: { type: Number, default: 0, min: 0 },
    favoriteIpHashes: {
      type: [String],
      default: [],
      select: false,
    },

    // PAPELERA (soft delete)
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

/* =========================
   HOOKS / MÉTODOS
   ========================= */

// Antes de validar: si no viene sedeKey, usar hotelCode como fallback
HabitacionSchema.pre("validate", function (next) {
  if (!this.sedeKey && this.hotelCode) {
    this.sedeKey = this.hotelCode;
  }
  next();
});

// Antes de guardar: recalcula rating según favoritesCount
HabitacionSchema.pre("save", function (next) {
  this.rating = computeRatingFromFavorites(this.favoritesCount || 0);
  next();
});

// Método estático para recalcular rating después de un $inc en favoritesCount
HabitacionSchema.statics.updateRatingFromFavorites = async function (id) {
  const hab = await this.findById(id);
  if (!hab) return null;
  hab.rating = computeRatingFromFavorites(hab.favoritesCount || 0);
  await hab.save();
  return hab;
};

module.exports = mongoose.model("Habitacion", HabitacionSchema);
