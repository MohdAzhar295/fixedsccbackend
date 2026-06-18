/**
 * Customer order schema — prepaid orders placed via the storefront.
 */
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product_id: String,
    name: String,
    sku: String,
    price: Number,
    quantity: Number,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    legacyId: { type: String, index: true },
    order_number: { type: String, required: true, unique: true },
    status: { type: String, default: "pending" },
    payment_method: { type: String, default: "Prepaid" },
    customer_name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    address: { type: String, required: true },
    city: { type: String, default: "" },
    pincode: { type: String, default: "" },
    notes: { type: String, default: "" },
    items: [orderItemSchema],
    total: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
