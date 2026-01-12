// shop-service/src/routes/dashboard.routes.js
const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/permissions.middleware");

const Product = require("../models/Product");
const Sale = require("../models/Sale");
const StockMovement = require("../models/StockMovement");

const router = express.Router();

function toDateStr(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function getRange(from, to) {
  const now = new Date();

  let end = to ? new Date(to) : now;
  let start = from ? new Date(from) : new Date(end);

  if (!from) {
    start = new Date(end);
    start.setDate(end.getDate() - 6);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// GET /api/shop/dashboard?sedeKey=&section=&from=&to=
router.get("/", auth, requirePermissions(["view_shop"]), async (req, res) => {
  try {
    const sedeKey = req.query.sedeKey ?? req.query.sede ?? req.query.site;
    const { section, from, to } = req.query;

    const { start, end } = getRange(from, to);
    const todayStr = toDateStr(new Date());
    const rangeLabel = `${toDateStr(start)} → ${toDateStr(end)}`;

    // ---- VENTAS ----
    const saleQuery = { isDeleted: false };
    if (sedeKey) saleQuery.site = String(sedeKey);
    if (section) saleQuery.section = String(section);
    saleQuery.createdAt = { $gte: start, $lte: end };

    const sales = await Sale.find(saleQuery).lean();

    let rangeTotal = 0;
    let rangeCount = 0;
    let todayTotal = 0;
    let todayCount = 0;

    const bySectionMap = new Map();
    const byPaymentMap = new Map();

    for (const s of sales) {
      const total = Number(s.total || 0);
      if (Number.isFinite(total)) rangeTotal += total;
      rangeCount += 1;

      const dStr = toDateStr(s.createdAt);
      if (dStr === todayStr) {
        if (Number.isFinite(total)) todayTotal += total;
        todayCount += 1;
      }

      const sec = s.section || "normal";
      const secEntry = bySectionMap.get(sec) || { section: sec, amount: 0, count: 0 };
      if (Number.isFinite(total)) secEntry.amount += total;
      secEntry.count += 1;
      bySectionMap.set(sec, secEntry);

      const pm = s.paymentMethod || "interno";
      const pmEntry = byPaymentMap.get(pm) || { paymentMethod: pm, amount: 0, count: 0 };
      if (Number.isFinite(total)) pmEntry.amount += total;
      pmEntry.count += 1;
      byPaymentMap.set(pm, pmEntry);
    }

    const avgTicket = rangeCount > 0 ? Math.round((rangeTotal / rangeCount) * 100) / 100 : 0;

    const bySection = Array.from(bySectionMap.values()).sort((a, b) => b.amount - a.amount);
    const byPayment = Array.from(byPaymentMap.values()).sort((a, b) => b.amount - a.amount);

    // ---- STOCK BAJO ----
    const lowStockQuery = {
      isDeleted: false,
      active: true,
      minStock: { $gt: 0 },
    };
    if (sedeKey) lowStockQuery.site = String(sedeKey);
    if (section) lowStockQuery.section = String(section);

    const lowStockDocs = await Product.find({
      ...lowStockQuery,
      $expr: { $lte: ["$stock", "$minStock"] },
    })
      .sort({ stock: 1, name: 1 })
      .limit(8)
      .lean();

    const lowStock = lowStockDocs.map((p) => ({
      id: String(p._id),
      name: p.name,
      sedeKey: p.site,
      section: p.section,
      stock: p.stock,
      minStock: p.minStock,
    }));

    // ---- MOVIMIENTOS RECIENTES ----
    const movQuery = {};
    if (sedeKey) movQuery.site = String(sedeKey);
    if (section) movQuery.section = String(section);
    movQuery.createdAt = { $gte: start, $lte: end };

    const movDocs = await StockMovement.find(movQuery)
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("productId")
      .lean();

    const recentMovements = movDocs.map((m) => ({
      id: String(m._id),
      sedeKey: m.site,
      section: m.section,
      type: m.type,
      delta: m.delta,
      before: m.before,
      after: m.after,
      reason: m.reason || "",
      createdAt: m.createdAt,
      productName: m.productId?.name || "Producto",
    }));

    return res.json({
      rangeLabel,
      salesSummary: {
        rangeTotal,
        rangeCount,
        todayTotal,
        todayCount,
        avgTicket,
        bySection,
        byPayment,
      },
      lowStock,
      recentMovements,
    });
  } catch (err) {
    console.error("[shop-dashboard] error:", err);
    return res.status(500).json({ message: "Error obteniendo dashboard de shop" });
  }
});

module.exports = router;
