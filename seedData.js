/**
 * Seed helpers — import data.json and default shop categories when DB is empty.
 */
const fs = require("fs");
const path = require("path");
const Product = require("./models/Product");
const Order = require("./models/Order");
const Lead = require("./models/Lead");
const ShopCategory = require("./models/ShopCategory");
const { CATEGORY_IMAGE_URLS } = require("./commonProducts");

const DATA_FILE = path.join(__dirname, "data.json");

const DEFAULT_SHOP_CATEGORIES = [
  {
    name: "Compressors",
    slug: "compressors",
    image_url: CATEGORY_IMAGE_URLS.Compressors,
    visible: true,
    sort_order: 1,
  },
  {
    name: "Capacitors",
    slug: "capacitors",
    image_url: CATEGORY_IMAGE_URLS.Capacitors,
    visible: true,
    sort_order: 2,
  },
  {
    name: "Air Conditioner",
    slug: "air-conditioner",
    image_url: CATEGORY_IMAGE_URLS["Air Conditioner"],
    visible: true,
    sort_order: 3,
  },
  {
    name: "Remotes",
    slug: "remotes",
    image_url: CATEGORY_IMAGE_URLS.Remotes,
    visible: true,
    sort_order: 4,
  },
  {
    name: "Refrigerant",
    slug: "refrigerant",
    image_url: CATEGORY_IMAGE_URLS.Refrigerant,
    visible: true,
    sort_order: 5,
  },
  {
    name: "Copper",
    slug: "copper",
    image_url: CATEGORY_IMAGE_URLS.Copper,
    visible: true,
    sort_order: 6,
  },
];

function loadJsonData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Failed to read data.json:", err.message);
  }
  return { products: [], orders: [], leads: [] };
}

async function seedIfEmpty() {
  const data = loadJsonData();

  if ((await Product.countDocuments()) === 0 && data.products.length) {
    await Product.insertMany(
      data.products.map((p) => ({
        legacyId: String(p.id),
        sku: p.sku,
        name: p.name,
        category: p.category || "General",
        brand: p.brand || "",
        price: Number(p.price) || 0,
        stock: Number(p.stock) || 0,
        description: p.description || "",
        compatibility: p.compatibility || "",
        image_url: p.image_url || "",
      }))
    );
    console.log(`Seeded ${data.products.length} products from data.json`);
  }

  if ((await Order.countDocuments()) === 0 && data.orders.length) {
    await Order.insertMany(
      data.orders.map((o) => ({
        legacyId: String(o.id),
        order_number: o.order_number,
        status: o.status || "pending",
        payment_method: o.payment_method || "Prepaid",
        customer_name: o.customer_name,
        phone: o.phone,
        email: o.email || "",
        address: o.address,
        city: o.city || "",
        pincode: o.pincode || "",
        notes: o.notes || "",
        items: o.items || [],
        total: o.total || 0,
        created_at: o.created_at ? new Date(o.created_at) : new Date(),
      }))
    );
    console.log(`Seeded ${data.orders.length} orders from data.json`);
  }

  if ((await Lead.countDocuments()) === 0 && data.leads.length) {
    await Lead.insertMany(
      data.leads.map((l) => ({
        legacyId: String(l.id),
        customer_name: l.customer_name,
        phone: l.phone,
        city: l.city || "",
        ac_brand: l.ac_brand || "",
        problem: l.problem,
        status: l.status || "new",
        created_at: l.created_at ? new Date(l.created_at) : new Date(),
      }))
    );
    console.log(`Seeded ${data.leads.length} leads from data.json`);
  }

  if ((await ShopCategory.countDocuments()) === 0) {
    await ShopCategory.insertMany(DEFAULT_SHOP_CATEGORIES);
    console.log(`Seeded ${DEFAULT_SHOP_CATEGORIES.length} default shop categories`);
  }
}

/** Upsert shop categories by slug — safe to run on production after deploy. */
async function syncShopCategories() {
  let inserted = 0;
  let updated = 0;

  for (const cat of DEFAULT_SHOP_CATEGORIES) {
    const existing = await ShopCategory.findOne({ slug: cat.slug });
    if (existing) {
      await ShopCategory.updateOne(
        { slug: cat.slug },
        {
          $set: {
            name: cat.name,
            image_url: cat.image_url,
            visible: cat.visible,
            sort_order: cat.sort_order,
          },
        }
      );
      updated += 1;
    } else {
      await ShopCategory.create(cat);
      inserted += 1;
    }
  }

  const validSlugs = DEFAULT_SHOP_CATEGORIES.map((c) => c.slug);
  await ShopCategory.updateMany(
    { slug: { $nin: validSlugs } },
    { $set: { visible: false } }
  );

  return { inserted, updated, total: DEFAULT_SHOP_CATEGORIES.length };
}

module.exports = { seedIfEmpty, syncShopCategories, DEFAULT_SHOP_CATEGORIES };
