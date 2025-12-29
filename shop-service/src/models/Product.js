const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    section: { type: String, enum: ["normal", "alcohol"], required: true },

    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopCategory", required: true },

    // "sede del hot": ej casa_frida, cabanas_fridas
    site: { type: String, required: true, trim: true },

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
