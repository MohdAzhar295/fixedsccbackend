/**
 * Product.js — Mongoose schema for AC spare parts (products collection)
 *
 * FIELDS: sku, name, price, stock, category, brand, image_url, compatibility
 * USED:   store.js CRUD — API returns normalized JSON with in_stock flag
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
    image_urls: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);

