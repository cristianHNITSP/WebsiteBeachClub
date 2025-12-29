const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    section: { type: String, enum: ["normal", "alcohol"], required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CategorySchema.index({ section: 1, name: 1 });

module.exports = mongoose.model("ShopCategory", CategorySchema);
