/**
 * MongoDB connection module.
 * Connects to Atlas via MONGODB_URI before the Express server accepts requests.
 */
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

/** Open connection with retry-friendly options for Render cold starts. */
async function connectDB() {
  if (process.env.USE_JSON_STORE === "1") {
    console.log("Skipping MongoDB (USE_JSON_STORE=1)");
    return;
  }
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is required");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("MongoDB connected");
}

/** Close connection cleanly on process shutdown. */
async function disconnectDB() {
  await mongoose.disconnect();
  console.log("MongoDB disconnected");
}

module.exports = { connectDB, disconnectDB };
