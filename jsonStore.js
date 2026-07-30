/**
 * jsonStore.js — Local dev data layer (JSON file, no MongoDB)
 *
 * WHAT:  Same functions as store.js but reads/writes local-db.json on disk.
 * WHEN:  server.js loads this if env USE_JSON_STORE=1 (never set on Render).
 * SETUP: Run `npm run local:setup` first to create local-db.json.
 */
const fs = require("fs");
const path = require("path");
const { randomBytes } = require("crypto");

const DB_FILE = path.join(__dirname, "local-db.json");

function load() {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error("local-db.json missing — run: npm run local:setup");
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

function newId() {
  return String(Date.now()) + randomBytes(2).toString("hex");
}

function resolveProductImages(p) {
  const urls = Array.isArray(p.image_urls)
    ? p.image_urls.filter((u) => u && String(u).trim()).slice(0, 5)
    : [];
  if (urls.length === 0 && p.image_url) {
    urls.push(String(p.image_url).trim());
  }
  return {
    image_urls: urls,
    image_url: urls[0] || "",
  };
}

function parseProductImageInput(input) {
  if (Array.isArray(input.image_urls)) {
    const urls = input.image_urls
      .map((u) => String(u ?? "").trim())
      .filter(Boolean)
      .slice(0, 5);
    return { image_urls: urls, image_url: urls[0] || "" };
  }
  if (input.image_url !== undefined) {
    const url = String(input.image_url ?? "").trim();
    return { image_urls: url ? [url] : [], image_url: url };
  }
  return null;
}

function normalizeProduct(p) {
  const stock = Number(p.stock ?? 0);
  const images = resolveProductImages(p);
  return {
    id: String(p.legacyId || p._id),
    name: p.name || "",
    sku: p.sku || "",
    price: Number(p.price) || 0,
    category: p.category || "General",
    brand: p.brand || "",
    description: p.description || "",
    compatibility: p.compatibility || "",
    image_url: images.image_url,
    image_urls: images.image_urls,
    stock,
    inventory: stock,
    in_stock: stock > 0,
  };
}

function normalizeShopCategory(c) {
  return {
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    image_url: c.image_url || "",
    visible: Boolean(c.visible),
    sort_order: Number(c.sort_order) || 0,
  };
}

function normalizeOrder(o) {
  return {
    id: String(o.legacyId || o._id),
    order_number: o.order_number,
    status: o.status,
    payment_method: o.payment_method,
    customer_name: o.customer_name,
    phone: o.phone,
    email: o.email || "",
    address: o.address,
    city: o.city || "",
    pincode: o.pincode || "",
    notes: o.notes || "",
    items: o.items || [],
    total: o.total || 0,
    created_at: o.created_at || new Date().toISOString(),
  };
}

function normalizeLead(l) {
  return {
    id: String(l.legacyId || l._id),
    customer_name: l.customer_name,
    phone: l.phone,
    city: l.city || "",
    ac_brand: l.ac_brand || "",
    problem: l.problem,
    status: l.status || "new",
    created_at: l.created_at || new Date().toISOString(),
  };
}

function findProduct(db, id) {
  return db.products.find((p) => p.legacyId === String(id) || p._id === String(id) || p.sku === String(id));
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function initializeStore() {
  if (!fs.existsSync(DB_FILE)) {
    require("./prepareLocalDb.js");
  }
}

async function getAllProducts() {
  const db = load();
  return db.products.map(normalizeProduct);
}

async function getProduct(id) {
  const db = load();
  const p = findProduct(db, id);
  return p ? normalizeProduct(p) : null;
}

async function createProduct(input) {
  const name = String(input?.name ?? "").trim();
  const sku = String(input?.sku ?? "").trim();
  if (!name || !sku) throw new Error("Name and SKU are required");
  const db = load();
  const product = {
    _id: newId(),
    legacyId: sku,
    sku,
    name,
    category: input.category || "General",
    brand: input.brand || "",
    price: Number(input.price) || 0,
    stock: Number(input.stock) || 0,
    description: input.description || "",
    compatibility: input.compatibility || "",
    ...parseProductImageInput(input) || { image_url: "", image_urls: [] },
  };
  db.products.unshift(product);
  save(db);
  return normalizeProduct(product);
}

async function updateProduct(id, input) {
  const db = load();
  const product = findProduct(db, id);
  if (!product) throw new Error("Product not found");
  Object.assign(product, {
    ...(input.sku !== undefined && { sku: input.sku }),
    ...(input.name !== undefined && { name: input.name }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.brand !== undefined && { brand: input.brand }),
    ...(input.price !== undefined && { price: Number(input.price) }),
    ...(input.stock !== undefined && { stock: Number(input.stock) }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.compatibility !== undefined && { compatibility: input.compatibility }),
    ...(parseProductImageInput(input) || {}),
  });
  save(db);
  return normalizeProduct(product);
}

async function deleteProduct(id) {
  const db = load();
  const idx = db.products.findIndex((p) => p.legacyId === String(id) || p._id === String(id));
  if (idx === -1) throw new Error("Product not found");
  db.products.splice(idx, 1);
  save(db);
  return { success: true };
}

async function createOrder(orderInput) {
  const db = load();
  const items = orderInput.items || [];
  const order = {
    _id: newId(),
    legacyId: newId(),
    order_number: `SCC-${Date.now().toString().slice(-6)}`,
    status: "pending",
    payment_method: orderInput.payment_method || "Prepaid",
    customer_name: orderInput.customer_name,
    phone: orderInput.phone,
    email: orderInput.email || "",
    address: orderInput.address,
    city: orderInput.city || "",
    pincode: orderInput.pincode || "",
    notes: orderInput.notes || "",
    items,
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    created_at: new Date().toISOString(),
  };
  db.orders.unshift(order);
  save(db);
  return normalizeOrder(order);
}

async function getAdminOrders() {
  return load().orders.map(normalizeOrder);
}

async function updateOrder(id, { status }) {
  const db = load();
  const order = db.orders.find(
    (o) => o.legacyId === String(id) || o.order_number === id || o._id === String(id)
  );
  if (!order) throw new Error("Order not found");
  if (status) order.status = status;
  save(db);
  return normalizeOrder(order);
}

async function createLead(leadInput) {
  const db = load();
  const lead = {
    _id: newId(),
    legacyId: newId(),
    customer_name: leadInput.customer_name,
    phone: leadInput.phone,
    city: leadInput.city || "",
    ac_brand: leadInput.ac_brand || "",
    problem: leadInput.problem,
    status: "new",
    created_at: new Date().toISOString(),
  };
  db.leads.unshift(lead);
  save(db);
  return normalizeLead(lead);
}

async function getLeads() {
  return load().leads.map(normalizeLead);
}

async function updateLead(id, { status }) {
  const db = load();
  const lead = db.leads.find((l) => l.legacyId === String(id) || l._id === String(id));
  if (!lead) throw new Error("Lead not found");
  if (status) lead.status = status;
  save(db);
  return normalizeLead(lead);
}

async function getVisibleShopCategories() {
  const db = load();
  return db.shopCategories
    .filter((c) => c.visible)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(normalizeShopCategory);
}

async function getAllShopCategories() {
  return load()
    .shopCategories.sort((a, b) => a.sort_order - b.sort_order)
    .map(normalizeShopCategory);
}

async function createShopCategory(input) {
  if (!input.name) throw new Error("Category name is required");
  const db = load();
  const category = {
    _id: newId(),
    name: input.name,
    slug: input.slug || slugify(input.name),
    image_url: input.image_url || "",
    visible: input.visible !== false,
    sort_order: Number(input.sort_order) || 0,
  };
  db.shopCategories.push(category);
  save(db);
  return normalizeShopCategory(category);
}

async function updateShopCategory(id, input) {
  const db = load();
  const category = db.shopCategories.find((c) => c._id === String(id));
  if (!category) throw new Error("Category not found");
  Object.assign(category, {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.slug !== undefined && { slug: input.slug }),
    ...(input.name !== undefined && input.slug === undefined && { slug: slugify(input.name) }),
    ...(input.image_url !== undefined && { image_url: input.image_url }),
    ...(input.visible !== undefined && { visible: Boolean(input.visible) }),
    ...(input.sort_order !== undefined && { sort_order: Number(input.sort_order) }),
  });
  save(db);
  return normalizeShopCategory(category);
}

async function deleteShopCategory(id) {
  const db = load();
  const idx = db.shopCategories.findIndex((c) => c._id === String(id));
  if (idx === -1) throw new Error("Category not found");
  db.shopCategories.splice(idx, 1);
  save(db);
  return { success: true };
}

async function getStats() {
  const db = load();
  const products = db.products.map(normalizeProduct);
  return {
    total_orders: db.orders.length,
    pending_orders: db.orders.filter((o) => o.status === "pending").length,
    products: products.length,
    low_stock: products.filter((p) => p.stock <= 5).length,
    new_leads: db.leads.filter((l) => l.status === "new").length,
  };
}

module.exports = {
  initializeStore,
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  createOrder,
  getAdminOrders,
  updateOrder,
  createLead,
  getLeads,
  updateLead,
  getStats,
  getVisibleShopCategories,
  getAllShopCategories,
  createShopCategory,
  updateShopCategory,
  deleteShopCategory,
};

