/**
 * Product catalog schema — AC spare parts inventory.
 */
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    legacyId: { type: String, index: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, default: "General" },
    brand: { type: String, default: "" },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    description: { type: String, default: "" },
    compatibility: { type: String, default: "" },
    image_url: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
