/**
 * Homepage "Shop by Category" tile — name, image, visibility, and sort order.
 */
const mongoose = require("mongoose");

const shopCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    image_url: { type: String, default: "" },
    visible: { type: Boolean, default: true },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShopCategory", shopCategorySchema);
