// shop-service/src/routes/sales.routes.js
const express = require("express");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const StockMovement = require("../models/StockMovement");
const Sede = require("../models/Sede");
const auth = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/permissions.middleware");

const router = express.Router();

function getRoleKey(u) {
  const r = u?.role;
  if (!r) return "";
  if (typeof r === "string") return r;
  return r?.key || r?.name || "";
}

async function resolveSedeKeyOrFail(rawKey) {
  const k = Sede.normalizeKey(rawKey);
  if (!k) return { ok: false, status: 400, message: "sedeKey inválida." };

  const sede = await Sede.findByKey(k);
  if (!sede) return { ok: false, status: 409, message: "La sede no existe. Regístrala primero." };
  if (sede.isActive === false)
    return { ok: false, status: 409, message: "La sede está desactivada." };

  return { ok: true, key: sede.key, sedeId: sede._id };
}

// POST /api/shop/sales
// body: { sedeKey, section, items:[{productId, qty}], paymentMethod?, note? }
router.post("/", auth, requirePermissions(["pos_shop"]), async (req, res) => {
  const { section, items, paymentMethod, note } = req.body || {};
  const sedeKeyRaw = req.body?.sedeKey ?? req.body?.sede ?? req.body?.site;

  if (!sedeKeyRaw || !section || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "sedeKey, section e items son requeridos" });
  }

  const sedeResolved = await resolveSedeKeyOrFail(sedeKeyRaw);
  if (!sedeResolved.ok) return res.status(sedeResolved.status).json({ message: sedeResolved.message });

  // consolidar por productId
  const map = new Map();
  for (const it of items) {
    const pid = String(it?.productId || "");
    const qty = Number(it?.qty || 0);
    if (!pid || !Number.isFinite(qty) || qty <= 0) continue;
    map.set(pid, (map.get(pid) || 0) + qty);
  }

  const normalized = Array.from(map.entries()).map(([productId, qty]) => ({ productId, qty }));
  if (!normalized.length) return res.status(400).json({ message: "items inválidos" });

  const applied = [];
  const saleItems = [];
  let total = 0;

  try {
    for (const it of normalized) {
      const p = await Product.findOne({
        _id: it.productId,
        site: sedeResolved.key,
        section,
        isDeleted: false,
        active: true,
      });

      if (!p) throw new Error(`Producto no encontrado (${it.productId})`);

      const before = p.stock;
      if (before < it.qty) throw new Error(`Stock insuficiente: ${p.name} (stock ${before})`);

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
        section: p.section,
        productId: p._id,
        type: "sale",
        delta: -it.qty,
        before,
        after: p.stock,
        reason: "Venta POS",
        createdBy: {
          id: String(req.user?.id || ""),
          email: String(req.user?.email || ""),
          role: getRoleKey(req.user),
        },
      });
    }

    const createdSale = await Sale.create({
      site: sedeResolved.key,
      section,
      items: saleItems,
      total: Math.round((total + Number.EPSILON) * 100) / 100,
      paymentMethod: String(paymentMethod || "interno"),
      note: String(note || ""),
      createdBy: {
        id: String(req.user?.id || ""),
        email: String(req.user?.email || ""),
        role: getRoleKey(req.user),
      },
    });

    res.status(201).json({ item: createdSale });
  } catch (err) {
    for (const a of applied) {
      await Product.findByIdAndUpdate(a._id, { stock: a.before });
    }
    return res.status(400).json({ message: err.message || "Error creando venta" });
  }
});

// GET /api/shop/sales?sedeKey=&from=&to=&page=&limit=
router.get("/", auth, requirePermissions(["view_shop"]), async (req, res) => {
  const sedeKey = req.query.sedeKey ?? req.query.sede ?? req.query.site;
  const { from, to, page = 1, limit = 30 } = req.query;

  const q = { isDeleted: false };
  if (sedeKey) q.site = String(sedeKey);

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
