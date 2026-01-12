// shop-service/src/models/Sale.js
const mongoose = require("mongoose");

const SaleItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopProduct", required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new mongoose.Schema(
  {
    // DB: site — API: sedeKey (alias)
    site: { type: String, required: true, trim: true, alias: "sedeKey" },

    section: { type: String, enum: ["normal", "alcohol"], required: true },

    items: { type: [SaleItemSchema], default: [] },
    total: { type: Number, required: true, min: 0 },

    paymentMethod: { type: String, default: "interno" },
    note: { type: String, default: "" },

    createdBy: {
      id: { type: String, default: "" },
      email: { type: String, default: "" },
      role: { type: String, default: "" },
    },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SaleSchema.index({ site: 1, createdAt: -1 });

module.exports = mongoose.model("ShopSale", SaleSchema);
