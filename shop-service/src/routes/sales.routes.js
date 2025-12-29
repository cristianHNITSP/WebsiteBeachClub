const express = require("express");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const StockMovement = require("../models/StockMovement");
const auth = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/permissions.middleware");

const router = express.Router();

// POST /api/shop/sales
// body: { site, section, items:[{productId, qty}], paymentMethod?, note? }
router.post("/", auth, requirePermissions(["pos_shop"]), async (req, res) => {
  const { site, section, items, paymentMethod, note } = req.body || {};

  if (!site || !section || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "site, section e items son requeridos" });
  }

  // consolidar por productId (por si se repite)
  const map = new Map();
  for (const it of items) {
    const pid = String(it?.productId || "");
    const qty = Number(it?.qty || 0);
    if (!pid || !Number.isFinite(qty) || qty <= 0) continue;
    map.set(pid, (map.get(pid) || 0) + qty);
  }

  const normalized = Array.from(map.entries()).map(([productId, qty]) => ({ productId, qty }));
  if (!normalized.length) return res.status(400).json({ message: "items inválidos" });

  const applied = []; // para rollback: { _id, qty, before, after }
  const saleItems = [];
  let total = 0;

  try {
    for (const it of normalized) {
      const p = await Product.findOne({
        _id: it.productId,
        site: String(site),
        section,
        isDeleted: false,
        active: true,
      });

      if (!p) throw new Error(`Producto no encontrado (${it.productId})`);

      const before = p.stock;
      if (before < it.qty) throw new Error(`Stock insuficiente: ${p.name} (stock ${before})`);

      // aplicar descuento stock
      p.stock = before - it.qty;
      await p.save();

      const unitPrice = Number(p.unitPrice);
      const subtotal = unitPrice * it.qty;

      saleItems.push({
        productId: p._id,
        name: p.name,
        qty: it.qty,
        unitPrice,
        subtotal,
      });

      total += subtotal;

      applied.push({ _id: p._id, qty: it.qty, before, after: p.stock });

      await StockMovement.create({
        site: p.site,
        productId: p._id,
        type: "sale",
        delta: -it.qty,
        before,
        after: p.stock,
        reason: "Venta POS",
        createdBy: {
          id: String(req.user?.id || ""),
          email: String(req.user?.email || ""),
          role: String(req.user?.role || ""),
        },
      });
    }

    const createdSale = await Sale.create({
      site: String(site),
      section,
      items: saleItems,
      total: Math.round((total + Number.EPSILON) * 100) / 100,
      paymentMethod: String(paymentMethod || "interno"),
      note: String(note || ""),
      createdBy: {
        id: String(req.user?.id || ""),
        email: String(req.user?.email || ""),
        role: String(req.user?.role || ""),
      },
    });

    res.status(201).json({ item: createdSale });
  } catch (err) {
    // rollback simple (no transacciones porque mongo single node normalmente no trae replica set)
    for (const a of applied) {
      await Product.findByIdAndUpdate(a._id, { stock: a.before });
    }
    return res.status(400).json({ message: err.message || "Error creando venta" });
  }
});

// GET /api/shop/sales?site=&from=&to=&page=&limit=
router.get("/", auth, requirePermissions(["view_shop"]), async (req, res) => {
  const { site, from, to, page = 1, limit = 30 } = req.query;

  const q = { isDeleted: false };
  if (site) q.site = String(site);

  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to) q.createdAt.$lte = new Date(to);
  }

  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 30));

  const [items, total] = await Promise.all([
    Sale.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    Sale.countDocuments(q),
  ]);

  res.json({ items, total, page: p, limit: l });
});

module.exports = router;
