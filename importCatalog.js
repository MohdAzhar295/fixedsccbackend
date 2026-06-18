/**
 * Import / upsert common products catalog into MongoDB.
 * Safe to run multiple times — matches on SKU.
 *
 * Usage: npm run seed:catalog
 */
require("dotenv").config();
const { connectDB, disconnectDB } = require("./db");
const Product = require("./models/Product");
const { seedIfEmpty, syncShopCategories } = require("./seedData");
const { COMMON_PRODUCTS } = require("./commonProducts");

async function importCatalog() {
  let inserted = 0;
  let updated = 0;

  for (const item of COMMON_PRODUCTS) {
    const existing = await Product.findOne({ sku: item.sku });
    if (existing) {
      await Product.updateOne(
        { sku: item.sku },
        {
          $set: {
            name: item.name,
            category: item.category,
            brand: item.brand,
            price: item.price,
            stock: item.stock,
            description: item.description,
            compatibility: item.compatibility,
            image_url: item.image_url,
          },
        }
      );
      updated += 1;
    } else {
      await Product.create({
        legacyId: item.sku,
        sku: item.sku,
        name: item.name,
        category: item.category,
        brand: item.brand,
        price: item.price,
        stock: item.stock,
        description: item.description,
        compatibility: item.compatibility,
        image_url: item.image_url,
      });
      inserted += 1;
    }
  }

  return { inserted, updated, total: COMMON_PRODUCTS.length };
}

async function main() {
  await connectDB();
  await seedIfEmpty();
  const result = await importCatalog();
  const categories = await syncShopCategories();
  await disconnectDB();
  console.log(
    `Catalog import complete: ${result.inserted} new, ${result.updated} updated (${result.total} items in catalog)`
  );
  console.log(
    `Shop categories: ${categories.inserted} new, ${categories.updated} updated (${categories.total} categories)`
  );
}

main().catch((err) => {
  console.error("Catalog import failed:", err.message);
  process.exit(1);
});
