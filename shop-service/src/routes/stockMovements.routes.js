// shop-service/src/routes/stockMovements.routes.js
const express = require("express");
const StockMovement = require("../models/StockMovement");
const auth = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/permissions.middleware");

const router = express.Router();

// GET /api/shop/stock-movements?sedeKey=&section=&from=&to=&page=&limit=
router.get("/", auth, requirePermissions(["view_shop"]), async (req, res) => {
  const sedeKey = req.query.sedeKey ?? req.query.sede ?? req.query.site;
  const { section, from, to, page = 1, limit = 50 } = req.query;

  const q = {};
  if (sedeKey) q.site = String(sedeKey);
  if (section) q.section = String(section);

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
