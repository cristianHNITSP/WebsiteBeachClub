// src/models/Sede.js
const mongoose = require("mongoose");

/* =========================
   Normalización de keys
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
   Schema
   ========================= */

const SedeSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,

    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    location: {
      city: { type: String, default: "", trim: true },
      state: { type: String, default: "", trim: true },
      country: { type: String, default: "México", trim: true },
    },
  },
  { timestamps: true }
);

/**
 * ✅ Índice único real (case-insensitive)
 * - Evita duplicados tipo: "Casa_Frida" vs "casa-frida" vs "cása frída"
 */
SedeSchema.index(
  { key: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

/* =========================
   Hooks
   ========================= */

SedeSchema.pre("validate", function (next) {
  // Si key viene vacío pero name existe, genera key desde name
  const raw = this.key || this.name;
  this.key = normalizeAndAliasSedeKey(raw);

  // Garantiza name limpio
  this.name = String(this.name || "").trim();

  next();
});

/* =========================
   Statics
   ========================= */

SedeSchema.statics.findByKey = function (key) {
  const k = normalizeAndAliasSedeKey(key);
  if (!k) return null;

  // Colación para que use el índice case-insensitive si aplica
  return this.findOne({ key: k })
    .collation({ locale: "en", strength: 2 })
    .exec();
};

module.exports = mongoose.model("Sede", SedeSchema);
