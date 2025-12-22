const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema(
  {
    isSpecial: { type: Boolean, default: false },
    description: { type: String, default: "" },
    discountPercent: { type: Number, default: null }, // ej. 10 = 10%
  },
  { _id: false }
);

const INVENTORY_STATES = [
  "Activa",
  "Mantenimiento",
  "Fuera de servicio",
  "Bloqueada",
];

/* =========================
   RATING desde favoritos
   ========================= */
// Ajusta este número según tu escala de tráfico:
// cuántos favoritos quieres que representen ~5 estrellas
const FAVORITES_FOR_FIVE_STARS = 25;

/**
 * Calcula rating (0–5) a partir de la cantidad de favoritos.
 * - 0 favoritos => 0 estrellas
 * - FAVORITES_FOR_FIVE_STARS favoritos o más => 5 estrellas
 * - Entre medio: escala lineal y redondeo a 1 decimal
 */
function computeRatingFromFavorites(favoritesCount) {
  const fav = Number(favoritesCount) || 0;
  if (fav <= 0) return 0;

  const raw = (fav / FAVORITES_FOR_FIVE_STARS) * 5; // escala lineal
  const clamped = Math.min(5, Math.max(0, raw));    // clamp 0–5
  return Math.round(clamped * 10) / 10;             // 1 decimal
}

const HabitacionSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true, trim: true },
    hotelCode: { type: String, required: true, trim: true },
    roomNumber: { type: String, required: true, trim: true },

    title: { type: String, required: true, trim: true },
    roomType: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    img: { type: String, default: "", trim: true },

    price: { type: Number, required: true, min: 0 },

    // ✅ rating se calcula desde favoritesCount (no lo seteas a mano)
    rating: { type: Number, default: 0, min: 0, max: 5 },

    amenities: { type: [String], default: [] },
    badge: { type: String, default: "", trim: true },
    featured: { type: Boolean, default: false },
    size: { type: Number, default: null },

    inventoryStatus: {
      type: String,
      default: "Activa",
      enum: INVENTORY_STATES,
      index: true,
    },

    offer: { type: OfferSchema, default: () => ({}) },

    // ❤️ Favoritos
    favoritesCount: { type: Number, default: 0, min: 0 },

    favoriteIpHashes: {
      type: [String],
      default: [],
      select: false,
    },

    // ✅ PAPELERA (soft delete)
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

/* =========================
   Hooks / Métodos
   ========================= */

/**
 * Pre-save: recalcula rating en base a favoritesCount
 */
HabitacionSchema.pre("save", function (next) {
  // this = documento de Habitacion
  this.rating = computeRatingFromFavorites(this.favoritesCount || 0);
  next();
});

/**
 * Método estático: actualizar rating de una habitación
 * Útil si hiciste un $inc directo sobre favoritesCount.
 *
 *   await Habitacion.updateRatingFromFavorites(habId);
 */
HabitacionSchema.statics.updateRatingFromFavorites = async function (id) {
  const hab = await this.findById(id);
  if (!hab) return null;
  hab.rating = computeRatingFromFavorites(hab.favoritesCount || 0);
  await hab.save();
  return hab;
};

module.exports = mongoose.model("Habitacion", HabitacionSchema);
