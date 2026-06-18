/**
 * One-time CLI seed script — run manually with: npm run seed
 */
require("dotenv").config();
const { connectDB, disconnectDB } = require("./db");
const { seedIfEmpty } = require("./seedData");

async function main() {
  await connectDB();
  await seedIfEmpty();
  await disconnectDB();
  console.log("Seed complete");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
