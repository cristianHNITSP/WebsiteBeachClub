// shop-service/src/models/Product.js
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    section: { type: String, enum: ["normal", "alcohol"], required: true },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopCategory",
      required: true,
    },

    // 🔥 DB: site (legacy) — API/UI: sedeKey (alias)
    site: { type: String, required: true, trim: true, alias: "sedeKey" },

    // opcional (si quieres link fuerte a Sede)
    sedeId: { type: mongoose.Schema.Types.ObjectId, ref: "Sede", default: null, index: true },

    unitPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    minStock: { type: Number, default: 0, min: 0 },

    imageUrl: { type: String, default: "" },
    active: { type: Boolean, default: true },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProductSchema.index({ site: 1, section: 1, categoryId: 1, active: 1 });
ProductSchema.index({ name: "text" });

module.exports = mongoose.model("ShopProduct", ProductSchema);
