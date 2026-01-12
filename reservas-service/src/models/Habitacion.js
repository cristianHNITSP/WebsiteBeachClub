// src/models/Habitacion.js
const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =========================
   Normalización de sede keys
   ========================= */

const SEDE_ALIASES = {
  cabanas_fridas: "cabanas_frida",
};

function normalizeSedeKey(input) {
  return (
    String(input || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || ""
  );
}

function normalizeAndAliasSedeKey(input) {
  const k = normalizeSedeKey(input);
  return SEDE_ALIASES[k] || k;
}

/* =========================
   OFFER
   ========================= */

function normalizeOffer(offerLike) {
  const offer = offerLike || {};
  const isSpecial = !!offer.isSpecial;

  let discount = offer.discountPercent;
  if (discount === "" || discount === undefined) discount = null;
  discount = discount === null ? null : Number(discount);

  if (!isSpecial) {
    return { isSpecial: false, description: "", discountPercent: null };
  }

  // si esSpecial pero viene mal el descuento, apágalo
  if (!Number.isFinite(discount) || discount <= 0 || discount >= 100) {
    return { isSpecial: false, description: "", discountPercent: null };
  }

  // descuento entero recomendado
  const discInt = Math.round(discount);

  return {
    isSpecial: true,
    description: String(offer.description || "").trim(),
    discountPercent: discInt,
  };
}

const OfferSchema = new Schema(
  {
    isSpecial: { type: Boolean, default: false },
    description: { type: String, default: "" },
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

const FAVORITES_FOR_FIVE_STARS = 25;

function computeRatingFromFavorites(favoritesCount) {
  const fav = Number(favoritesCount) || 0;
  if (fav <= 0) return 0;

  const raw = (fav / FAVORITES_FOR_FIVE_STARS) * 5;
  const clamped = Math.min(5, Math.max(0, raw));
  return Math.round(clamped * 10) / 10;
}

/* =========================
   helpers: arrays
   ========================= */

function normalizeImagesArray(arr) {
  if (!Array.isArray(arr)) return [];
  const cleaned = arr.map((x) => String(x || "").trim()).filter(Boolean);

  const seen = new Set();
  const unique = [];
  for (const u of cleaned) {
    if (!seen.has(u)) {
      seen.add(u);
      unique.push(u);
    }
  }
  return unique.slice(0, 12);
}

function normalizeTagsArray(arr) {
  if (!Array.isArray(arr)) return [];
  const cleaned = arr.map((x) => String(x || "").trim()).filter(Boolean);

  const seen = new Set();
  const unique = [];
  for (const t of cleaned) {
    const k = t.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      unique.push(t);
    }
  }
  return unique.slice(0, 40);
}

/* =========================
   SCHEMA PRINCIPAL
   ========================= */

const HabitacionSchema = new Schema(
  {
    codigo: {
      type: String,
      required: true,
      trim: true,
      // ⚠️ no unique aquí; lo ponemos con index + collation abajo
    },

    // Legacy (pero lo normalizamos)
    hotelCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    sedeId: {
      type: Schema.Types.ObjectId,
      ref: "Sede",
      index: true,
      default: null,
    },

    sedeKey: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },

    roomNumber: { type: String, required: true, trim: true },

    title: { type: String, required: true, trim: true },
    roomType: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },

    img: { type: String, default: "", trim: true },

    // ✅ setters para que aunque actualices desde cualquier lado, quede limpio
    images: { type: [String], default: [], set: normalizeImagesArray },

    price: { type: Number, required: true, min: 0 },

    rating: { type: Number, default: 0, min: 0, max: 5 },

    amenities: { type: [String], default: [], set: normalizeTagsArray },

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
    favoriteIpHashes: { type: [String], default: [], select: false },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

/**
 * ✅ Índice único real (case-insensitive) para codigo
 * Evita duplicados tipo "CF-103" vs "cf-103"
 */
HabitacionSchema.index(
  { codigo: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

/* =========================
   HOOKS
   ========================= */

HabitacionSchema.pre("validate", function (next) {
  // ✅ normaliza hotelCode/sedeKey + alias
  if (this.hotelCode) this.hotelCode = normalizeAndAliasSedeKey(this.hotelCode);

  if (!this.sedeKey && this.hotelCode) this.sedeKey = this.hotelCode;
  if (this.sedeKey) this.sedeKey = normalizeAndAliasSedeKey(this.sedeKey);

  // ✅ normaliza offer SIEMPRE para evitar estados inválidos en DB
  this.offer = normalizeOffer(this.offer);

  // ✅ Normaliza imágenes y garantiza compat con img
  const img = String(this.img || "").trim();
  const images = normalizeImagesArray(this.images);

  if (images.length === 0 && img) {
    this.images = [img];
  } else {
    this.images = images;
  }

  const finalImages = Array.isArray(this.images) ? this.images : [];
  this.img = finalImages.length ? String(finalImages[0] || "").trim() : img;

  next();
});

HabitacionSchema.pre("save", function (next) {
  this.rating = computeRatingFromFavorites(this.favoritesCount || 0);

  // Refuerza offer e imágenes
  this.offer = normalizeOffer(this.offer);

  const img = String(this.img || "").trim();
  const images = normalizeImagesArray(this.images);

  if (images.length === 0 && img) {
    this.images = [img];
  } else {
    this.images = images;
  }

  const finalImages = Array.isArray(this.images) ? this.images : [];
  this.img = finalImages.length ? String(finalImages[0] || "").trim() : img;

  next();
});

/**
 * ✅ Extra: si alguien hace update directo con $set favoritesCount
 * (sin pasar por save), al menos recalculamos rating en el UPDATE.
 * - OJO: si usan $inc favoritesCount no se puede calcular exacto aquí sin leer el doc.
 */
function patchUpdateDoc(update) {
  if (!update || typeof update !== "object") return update;

  const u = { ...update };
  const $set = { ...(u.$set || {}) };

  // sede keys
  if ($set.hotelCode !== undefined) $set.hotelCode = normalizeAndAliasSedeKey($set.hotelCode);
  if ($set.sedeKey !== undefined) $set.sedeKey = normalizeAndAliasSedeKey($set.sedeKey);

  // images/img
  if ($set.images !== undefined) $set.images = normalizeImagesArray($set.images);
  if ($set.img !== undefined) $set.img = String($set.img || "").trim();

  // amenities
  if ($set.amenities !== undefined) $set.amenities = normalizeTagsArray($set.amenities);

  // offer (si lo mandan completo)
  if ($set.offer !== undefined) $set.offer = normalizeOffer($set.offer);

  // favoritesCount via $set -> recalcula rating
  if ($set.favoritesCount !== undefined) {
    $set.rating = computeRatingFromFavorites($set.favoritesCount);
  }

  u.$set = $set;
  return u;
}

HabitacionSchema.pre(["findOneAndUpdate", "updateOne", "updateMany"], function (next) {
  const update = this.getUpdate();
  this.setUpdate(patchUpdateDoc(update));
  next();
});

/* =========================
   Statics
   ========================= */

HabitacionSchema.statics.updateRatingFromFavorites = async function (id) {
  const hab = await this.findById(id);
  if (!hab) return null;
  hab.rating = computeRatingFromFavorites(hab.favoritesCount || 0);
  await hab.save();
  return hab;
};

module.exports = mongoose.model("Habitacion", HabitacionSchema);
