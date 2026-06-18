/**
 * Smart Cool Care API server — Express routes for storefront and admin panel.
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./db");
const useJsonStore = process.env.USE_JSON_STORE === "1";
const store = useJsonStore ? require("./jsonStore") : require("./store");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

function sendError(res, status, message) {
  return res.status(status).json({ error: message, detail: message });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// --- Health ---
app.get("/health", async (_req, res) => {
  if (useJsonStore) {
    return res.json({
      status: "ok",
      store: "Smart Cool Care",
      database: "local-json",
    });
  }
  const mongoose = require("mongoose");
  res.json({
    status: "ok",
    store: "Smart Cool Care",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// --- Public product routes ---
app.get(
  "/api/products",
  asyncHandler(async (req, res) => {
    const { search, category, in_stock } = req.query;
    let products = await store.getAllProducts();

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q))
      );
    }
    if (category && category !== "all") {
      products = products.filter((p) => p.category === category);
    }
    if (in_stock === "true") {
      products = products.filter((p) => p.in_stock);
    }

    res.json(products);
  })
);

app.get(
  "/api/products/categories",
  asyncHandler(async (_req, res) => {
    const products = await store.getAllProducts();
    const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
    res.json({ categories });
  })
);

app.get(
  "/api/products/:id",
  asyncHandler(async (req, res) => {
    const product = await store.getProduct(req.params.id);
    if (!product) return sendError(res, 404, "Product not found");
    res.json(product);
  })
);

// --- Public shop category tiles (homepage) ---
app.get(
  "/api/shop-categories",
  asyncHandler(async (_req, res) => {
    res.json(await store.getVisibleShopCategories());
  })
);

// --- Orders & leads ---
app.post(
  "/api/orders",
  asyncHandler(async (req, res) => {
    const { customer_name, phone, email, address, city, pincode, notes, items, payment_method } =
      req.body;

    if (!customer_name || !phone || !address || !items?.length) {
      return sendError(res, 400, "Missing required fields");
    }

    const order = await store.createOrder({
      customer_name,
      phone,
      email,
      address,
      city,
      pincode,
      notes,
      items,
      payment_method: payment_method || "Prepaid",
    });

    res.status(201).json(order);
  })
);

app.post(
  "/api/leads",
  asyncHandler(async (req, res) => {
    const { customer_name, phone, city, ac_brand, problem } = req.body;
    if (!customer_name || !phone || !problem) {
      return sendError(res, 400, "Name, phone and problem required");
    }

    const lead = await store.createLead({ customer_name, phone, city, ac_brand, problem });
    res.status(201).json(lead);
  })
);

// --- Admin auth ---
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    res.json({ token: process.env.ADMIN_SECRET });
  } else {
    sendError(res, 401, "Invalid credentials");
  }
});

const adminAuth = (req, res, next) => {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const headerToken = req.headers["x-admin-token"];
  const token = bearer || headerToken;

  if (token && token === process.env.ADMIN_SECRET) return next();
  return sendError(res, 401, "Unauthorized");
};

// --- Admin dashboard routes ---
app.get(
  "/api/admin/stats",
  adminAuth,
  asyncHandler(async (_req, res) => {
    res.json(await store.getStats());
  })
);

app.get(
  "/api/admin/orders",
  adminAuth,
  asyncHandler(async (_req, res) => {
    res.json(await store.getAdminOrders());
  })
);

app.put(
  "/api/admin/orders/:id",
  adminAuth,
  asyncHandler(async (req, res) => {
    const order = await store.updateOrder(req.params.id, req.body);
    res.json(order);
  })
);

app.get(
  "/api/admin/leads",
  adminAuth,
  asyncHandler(async (_req, res) => {
    res.json(await store.getLeads());
  })
);

app.put(
  "/api/admin/leads/:id",
  adminAuth,
  asyncHandler(async (req, res) => {
    const lead = await store.updateLead(req.params.id, req.body);
    res.json(lead);
  })
);

// --- Admin shop category CRUD ---
app.get(
  "/api/admin/shop-categories",
  adminAuth,
  asyncHandler(async (_req, res) => {
    res.json(await store.getAllShopCategories());
  })
);

app.post(
  "/api/admin/shop-categories",
  adminAuth,
  asyncHandler(async (req, res) => {
    const category = await store.createShopCategory(req.body);
    res.status(201).json(category);
  })
);

app.put(
  "/api/admin/shop-categories/:id",
  adminAuth,
  asyncHandler(async (req, res) => {
    const category = await store.updateShopCategory(req.params.id, req.body);
    res.json(category);
  })
);

app.delete(
  "/api/admin/shop-categories/:id",
  adminAuth,
  asyncHandler(async (req, res) => {
    await store.deleteShopCategory(req.params.id);
    res.json({ success: true });
  })
);

// --- Admin product CRUD ---
app.post(
  "/api/products",
  adminAuth,
  asyncHandler(async (req, res) => {
    const product = await store.createProduct(req.body);
    res.status(201).json(product);
  })
);

app.put(
  "/api/products/:id",
  adminAuth,
  asyncHandler(async (req, res) => {
    const product = await store.updateProduct(req.params.id, req.body);
    res.json(product);
  })
);

app.delete(
  "/api/products/:id",
  adminAuth,
  asyncHandler(async (req, res) => {
    await store.deleteProduct(req.params.id);
    res.json({ success: true });
  })
);

// --- Global error handler ---
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  sendError(res, 500, err.message || "Internal server error");
});

// --- Startup: connect MongoDB, seed if empty, then listen ---
async function start() {
  if (!useJsonStore) await connectDB();
  else console.log("Using local JSON store (USE_JSON_STORE=1)");
  await store.initializeStore();
  app.listen(PORT, () => {
    console.log(`Smart Cool Care backend running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
