/**
 * Data access layer — MongoDB-backed store with the same API surface as the old file store.
 */
const Product = require("./models/Product");
const Order = require("./models/Order");
const Lead = require("./models/Lead");
const ShopCategory = require("./models/ShopCategory");
const { seedIfEmpty } = require("./seedData");

/** Normalize a product document for API responses. */
function normalizeProduct(doc) {
  const p = doc.toObject ? doc.toObject() : doc;
  const stock = Number(p.stock ?? 0);
  return {
    id: String(p.legacyId || p._id),
    name: p.name || "",
    sku: p.sku || "",
    price: Number(p.price) || 0,
    category: p.category || "General",
    brand: p.brand || "",
    description: p.description || "",
    compatibility: p.compatibility || "",
    image_url: p.image_url || "",
    stock,
    inventory: stock,
    in_stock: stock > 0,
  };
}

/** Normalize a shop category document for API responses. */
function normalizeShopCategory(doc) {
  const c = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    image_url: c.image_url || "",
    visible: Boolean(c.visible),
    sort_order: Number(c.sort_order) || 0,
  };
}

/** Normalize an order document for API responses. */
function normalizeOrder(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
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
    created_at: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
  };
}

/** Normalize a lead document for API responses. */
function normalizeLead(doc) {
  const l = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(l.legacyId || l._id),
    customer_name: l.customer_name,
    phone: l.phone,
    city: l.city || "",
    ac_brand: l.ac_brand || "",
    problem: l.problem,
    status: l.status || "new",
    created_at: l.created_at ? new Date(l.created_at).toISOString() : new Date().toISOString(),
  };
}

async function findProductById(id) {
  if (/^[a-f\d]{24}$/i.test(String(id))) {
    const byMongo = await Product.findById(id);
    if (byMongo) return byMongo;
  }
  return Product.findOne({ legacyId: String(id) });
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// --- Products ---

async function getAllProducts() {
  const products = await Product.find().sort({ createdAt: -1 });
  return products.map(normalizeProduct);
}

async function getProduct(id) {
  const product = await findProductById(id);
  return product ? normalizeProduct(product) : null;
}

async function createProduct(input) {
  const name = String(input?.name ?? "").trim();
  const sku = String(input?.sku ?? "").trim();
  if (!name || !sku) {
    throw new Error("Name and SKU are required");
  }

  const product = await Product.create({
    legacyId: String(Date.now()),
    sku,
    name,
    category: input.category || "General",
    brand: input.brand || "",
    price: Number(input.price) || 0,
    stock: Number(input.stock) || 0,
    description: input.description || "",
    compatibility: input.compatibility || "",
    image_url: input.image_url || "",
  });

  return normalizeProduct(product);
}

async function updateProduct(id, input) {
  const product = await findProductById(id);
  if (!product) throw new Error("Product not found");

  if (input.sku !== undefined) product.sku = input.sku;
  if (input.name !== undefined) product.name = input.name;
  if (input.category !== undefined) product.category = input.category;
  if (input.brand !== undefined) product.brand = input.brand;
  if (input.price !== undefined) product.price = Number(input.price);
  if (input.stock !== undefined) product.stock = Number(input.stock);
  if (input.description !== undefined) product.description = input.description;
  if (input.compatibility !== undefined) product.compatibility = input.compatibility;
  if (input.image_url !== undefined) product.image_url = input.image_url;

  await product.save();
  return normalizeProduct(product);
}

async function deleteProduct(id) {
  const product = await findProductById(id);
  if (!product) throw new Error("Product not found");
  await product.deleteOne();
  return { success: true };
}

// --- Orders ---

async function createOrder(orderInput) {
  const items = orderInput.items || [];
  const order = await Order.create({
    legacyId: String(Date.now()),
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
    created_at: new Date(),
  });

  return normalizeOrder(order);
}

async function getAdminOrders() {
  const orders = await Order.find().sort({ created_at: -1 });
  return orders.map(normalizeOrder);
}

async function updateOrder(id, { status }) {
  const order =
    (await Order.findOne({ legacyId: String(id) })) ||
    (await Order.findOne({ order_number: id })) ||
    (/^[a-f\d]{24}$/i.test(String(id)) ? await Order.findById(id) : null);

  if (!order) throw new Error("Order not found");
  if (status) order.status = status;
  await order.save();
  return normalizeOrder(order);
}

// --- Leads ---

async function createLead(leadInput) {
  const lead = await Lead.create({
    legacyId: String(Date.now()),
    customer_name: leadInput.customer_name,
    phone: leadInput.phone,
    city: leadInput.city || "",
    ac_brand: leadInput.ac_brand || "",
    problem: leadInput.problem,
    status: "new",
    created_at: new Date(),
  });

  return normalizeLead(lead);
}

async function getLeads() {
  const leads = await Lead.find().sort({ created_at: -1 });
  return leads.map(normalizeLead);
}

async function updateLead(id, { status }) {
  const lead =
    (await Lead.findOne({ legacyId: String(id) })) ||
    (/^[a-f\d]{24}$/i.test(String(id)) ? await Lead.findById(id) : null);

  if (!lead) throw new Error("Lead not found");
  if (status) lead.status = status;
  await lead.save();
  return normalizeLead(lead);
}

// --- Shop categories (homepage tiles) ---

async function getVisibleShopCategories() {
  const categories = await ShopCategory.find({ visible: true }).sort({ sort_order: 1, name: 1 });
  return categories.map(normalizeShopCategory);
}

async function getAllShopCategories() {
  const categories = await ShopCategory.find().sort({ sort_order: 1, name: 1 });
  return categories.map(normalizeShopCategory);
}

async function createShopCategory(input) {
  if (!input.name) throw new Error("Category name is required");

  const slug = input.slug || slugify(input.name);
  const category = await ShopCategory.create({
    name: input.name,
    slug,
    image_url: input.image_url || "",
    visible: input.visible !== false,
    sort_order: Number(input.sort_order) || 0,
  });

  return normalizeShopCategory(category);
}

async function updateShopCategory(id, input) {
  const category = await ShopCategory.findById(id);
  if (!category) throw new Error("Category not found");

  if (input.name !== undefined) category.name = input.name;
  if (input.slug !== undefined) category.slug = input.slug;
  else if (input.name !== undefined) category.slug = slugify(input.name);
  if (input.image_url !== undefined) category.image_url = input.image_url;
  if (input.visible !== undefined) category.visible = Boolean(input.visible);
  if (input.sort_order !== undefined) category.sort_order = Number(input.sort_order);

  await category.save();
  return normalizeShopCategory(category);
}

async function deleteShopCategory(id) {
  const category = await ShopCategory.findById(id);
  if (!category) throw new Error("Category not found");
  await category.deleteOne();
  return { success: true };
}

// --- Stats ---

async function getStats() {
  const products = await getAllProducts();
  const [totalOrders, pendingOrders, newLeads] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: "pending" }),
    Lead.countDocuments({ status: "new" }),
  ]);

  return {
    total_orders: totalOrders,
    pending_orders: pendingOrders,
    products: products.length,
    low_stock: products.filter((p) => p.stock <= 5).length,
    new_leads: newLeads,
  };
}

/** Seed default data on first deploy when MongoDB collections are empty. */
async function initializeStore() {
  await seedIfEmpty();
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
