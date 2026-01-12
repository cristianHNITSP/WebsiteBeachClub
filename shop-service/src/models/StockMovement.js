// shop-service/src/models/StockMovement.js
const mongoose = require("mongoose");

const StockMovementSchema = new mongoose.Schema(
  {
    // DB: site — API: sedeKey (alias)
    site: { type: String, required: true, trim: true, alias: "sedeKey" },

    section: { type: String, enum: ["normal", "alcohol"], required: true },

    productId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopProduct", required: true },

    type: { type: String, enum: ["sale", "adjustment", "restock"], required: true },

    delta: { type: Number, required: true },
    before: { type: Number, required: true, min: 0 },
    after: { type: Number, required: true, min: 0 },

    reason: { type: String, default: "" },

    createdBy: {
      id: { type: String, default: "" },
      email: { type: String, default: "" },
      role: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

StockMovementSchema.index({ site: 1, productId: 1, createdAt: -1 });
StockMovementSchema.index({ site: 1, section: 1, createdAt: -1 });

module.exports = mongoose.model("ShopStockMovement", StockMovementSchema);
