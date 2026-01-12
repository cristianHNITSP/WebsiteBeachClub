// shop-service/src/models/Sede.js
const mongoose = require("mongoose");
const { normalizeAndAliasSedeKey } = require("../utils/sedeKey");

const SedeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true, index: true },
    location: {
      city: { type: String, default: "", trim: true },
      state: { type: String, default: "", trim: true },
      country: { type: String, default: "México", trim: true },
    },
  },
  { timestamps: true }
);

// único real case-insensitive
SedeSchema.index(
  { key: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

// ✅ aquí se genera/normaliza siempre
SedeSchema.pre("validate", function (next) {
  const raw = this.key || this.name;        // si no mandas key, usa name
  this.key = normalizeAndAliasSedeKey(raw); // genera canónica
  this.name = String(this.name || "").trim();
  this.description = String(this.description || "").trim();
  next();
});

// statics útiles
SedeSchema.statics.normalizeKey = normalizeAndAliasSedeKey;

SedeSchema.statics.findByKey = function (key) {
  const k = normalizeAndAliasSedeKey(key);
  if (!k) return null;
  return this.findOne({ key: k }).collation({ locale: "en", strength: 2 }).exec();
};

module.exports = mongoose.model("ShopSede", SedeSchema);
