/**
 * Service lead schema — AC repair / service enquiries from the website.
 */
const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    legacyId: { type: String, index: true },
    customer_name: { type: String, required: true },
    phone: { type: String, required: true },
    city: { type: String, default: "" },
    ac_brand: { type: String, default: "" },
    problem: { type: String, required: true },
    status: { type: String, default: "new" },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);
