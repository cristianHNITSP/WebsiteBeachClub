// shop-service/src/routes/categories.routes.js
const express = require("express");
const Category = require("../models/Category");
const auth = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/permissions.middleware");

const router = express.Router();

// GET /api/shop/categories?section=
router.get("/", auth, requirePermissions(["view_shop"]), async (req, res) => {
  const { section } = req.query;
  const q = { isDeleted: false };
  if (section) q.section = section;

  const items = await Category.find(q).sort({ name: 1 }).lean();
  res.json({ items });
});

// 🧺 GET /api/shop/categories/trash?section=
router.get("/trash", auth, requirePermissions(["manage_shop"]), async (req, res) => {
  const { section } = req.query;
  const q = { isDeleted: true };
  if (section) q.section = section;

  const items = await Category.find(q).sort({ updatedAt: -1, name: 1 }).lean();
  res.json({ items });
});

// ♻️ PATCH /api/shop/categories/:id/restore
router.patch("/:id/restore", auth, requirePermissions(["manage_shop"]), async (req, res) => {
  const { id } = req.params;
  const updated = await Category.findByIdAndUpdate(id, { isDeleted: false }, { new: true });
  if (!updated) return res.status(404).json({ message: "Categoría no encontrada" });
  res.json({ item: updated });
});

// POST /api/shop/categories
router.post("/", auth, requirePermissions(["manage_shop"]), async (req, res) => {
  const { name, section } = req.body || {};
  if (!name || !section) return res.status(400).json({ message: "name y section son requeridos" });

  const created = await Category.create({ name: String(name).trim(), section });
  res.status(201).json({ item: created });
});

// PATCH /api/shop/categories/:id
router.patch("/:id", auth, requirePermissions(["manage_shop"]), async (req, res) => {
  const { id } = req.params;
  const patch = {};
  if (req.body?.name !== undefined) patch.name = String(req.body.name).trim();
  if (req.body?.section !== undefined) patch.section = req.body.section;

  const updated = await Category.findByIdAndUpdate(id, patch, { new: true });
  if (!updated) return res.status(404).json({ message: "Categoría no encontrada" });
  res.json({ item: updated });
});

// DELETE (soft) /api/shop/categories/:id
router.delete("/:id", auth, requirePermissions(["manage_shop"]), async (req, res) => {
  const { id } = req.params;
  const updated = await Category.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  if (!updated) return res.status(404).json({ message: "Categoría no encontrada" });
  res.json({ ok: true });
});

module.exports = router;
