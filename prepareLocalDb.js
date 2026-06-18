/**
 * Build local-db.json with 50 catalog items for offline dev (no MongoDB).
 * Usage: npm run local:setup
 */
const fs = require("fs");
const path = require("path");
const { COMMON_PRODUCTS } = require("./commonProducts");
const { DEFAULT_SHOP_CATEGORIES } = require("./seedData");

const OUT = path.join(__dirname, "local-db.json");

const products = COMMON_PRODUCTS.map((p) => ({
  legacyId: p.sku,
  sku: p.sku,
  name: p.name,
  category: p.category,
  brand: p.brand,
  price: p.price,
  stock: p.stock,
  description: p.description,
  compatibility: p.compatibility,
  image_url: p.image_url,
}));

const shopCategories = DEFAULT_SHOP_CATEGORIES.map((c, i) => ({
  _id: `cat-${i + 1}`,
  name: c.name,
  slug: c.slug,
  image_url: c.image_url,
  visible: c.visible,
  sort_order: c.sort_order,
}));

const db = {
  products,
  orders: [],
  leads: [],
  shopCategories,
};

fs.writeFileSync(OUT, JSON.stringify(db, null, 2), "utf8");
console.log(`Wrote ${products.length} products to ${OUT}`);
