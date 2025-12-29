// routes/stockMovements.js
const express = require("express");
const StockMovement = require("../models/StockMovement");
const auth = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/permissions.middleware");

const router = express.Router();

// GET /api/shop/stock-movements?site=&section=&from=&to=&page=&limit=
router.get("/", auth, requirePermissions(["view_shop"]), async (req, res) => {
  const { site, section, from, to, page = 1, limit = 50 } = req.query;

  const q = {};
  if (site) q.site = String(site);
  if (section) q.section = String(section); // solo si tu StockMovement guarda section (si no, quítalo)

  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to) q.createdAt.$lte = new Date(to);
  }

  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(200, Math.max(1, Number(limit) || 50));

  const [items, total] = await Promise.all([
    StockMovement.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    StockMovement.countDocuments(q),
  ]);

  res.json({ items, total, page: p, limit: l });
});

module.exports = router;
