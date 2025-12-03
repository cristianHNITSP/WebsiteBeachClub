const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema(
  {
    isSpecial: { type: Boolean, default: false },
    description: { type: String, default: "" },
    discountPercent: { type: Number, default: null }, // ej. 10 = 10%
  },
  { _id: false }
);

const INVENTORY_STATES = ["Activa", "Mantenimiento", "Fuera de servicio", "Bloqueada"];

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
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

module.exports = mongoose.model("Habitacion", HabitacionSchema);
