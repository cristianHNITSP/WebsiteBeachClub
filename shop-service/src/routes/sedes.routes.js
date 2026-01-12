// shop-service/src/routes/sedes.routes.js
const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/permissions.middleware");

const Sede = require("../models/Sede");
const Product = require("../models/Product");
const { humanizeKey } = require("../utils/sedeKey");

const router = express.Router();

function getRoleKey(u) {
  const r = u?.role;
  if (!r) return "";
  if (typeof r === "string") return r;
  return r?.key || r?.name || "";
}
function normalizePerms(u) {
  const raw = u?.permissions ?? u?.role?.permissions ?? u?.role?.data?.permissions;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") return raw.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
}
function canManage(req) {
  const isAdmin = getRoleKey(req.user) === "administrador";
  const perms = normalizePerms(req.user);
  return isAdmin || perms.includes("manage_shop");
}

// GET /api/shop/sedes?includeInactive=1
router.get("/", auth, requirePermissions(["view_shop"]), async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === "1" && canManage(req);

    const count = await Sede.countDocuments();
    if (count > 0) {
      const q = includeInactive ? {} : { isActive: true };
      const docs = await Sede.find(q).sort({ name: 1, key: 1 }).lean();
      return res.json({
        items: docs.map((s) => ({
          id: String(s._id),
          _id: String(s._id),
          key: s.key,
          name: s.name,
          description: s.description || "",
          isActive: s.isActive !== false,
        })),
      });
    }

    // Fallback legacy: si no hay sedes, derivamos desde products.site
    const raw = await Product.distinct("site", { isDeleted: false });
    const keys = (raw || [])
      .map((x) => Sede.normalizeKey(String(x || "")))
      .filter(Boolean)
      .sort();

    return res.json({
      items: keys.map((k) => ({
        id: `legacy:${k}`,
        _id: null,
        key: k,
        name: humanizeKey(k),
        description: "",
        isActive: true,
        legacy: true,
      })),
    });
  } catch (e) {
    console.error("[GET /shop/sedes] error:", e);
    return res.status(500).json({ message: "No se pudieron cargar las sedes." });
  }
});

// POST /api/shop/sedes
// body: { name, description?, isActive? }
// ✅ NO necesitas mandar key
router.post("/", auth, requirePermissions(["manage_shop"]), async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    const isActive = req.body?.isActive !== false;

    if (!name) return res.status(400).json({ message: "name es requerido." });

    const doc = await Sede.create({ name, description, isActive });
    return res.status(201).json({
      item: {
        id: String(doc._id),
        _id: String(doc._id),
        key: doc.key, // ✅ ya normalizada por backend
        name: doc.name,
        description: doc.description || "",
        isActive: doc.isActive !== false,
      },
    });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: "Ya existe una sede con esa key." });
    console.error("[POST /shop/sedes] error:", e);
    return res.status(500).json({ message: "No se pudo crear la sede." });
  }
});

// PATCH /api/shop/sedes/:id
// body: { name?, description?, isActive? }  (key NO se toca normalmente)
router.patch("/:id", auth, requirePermissions(["manage_shop"]), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "ID inválido." });

    const sede = await Sede.findById(id);
    if (!sede) return res.status(404).json({ message: "Sede no encontrada." });

    if (req.body?.name !== undefined) sede.name = String(req.body.name || "").trim();
    if (req.body?.description !== undefined) sede.description = String(req.body.description || "").trim();
    if (req.body?.isActive !== undefined) sede.isActive = !!req.body.isActive;

    // (Opcional avanzado) si algún día quieres permitir regenerar key:
    // if (req.body?.regenKey === true) sede.key = sede.name;

    await sede.save(); // ✅ aquí se aplica la normalización de key si corresponde

    return res.json({
      item: {
        id: String(sede._id),
        _id: String(sede._id),
        key: sede.key,
        name: sede.name,
        description: sede.description || "",
        isActive: sede.isActive !== false,
      },
    });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: "Ya existe una sede con esa key." });
    console.error("[PATCH /shop/sedes/:id] error:", e);
    return res.status(500).json({ message: "No se pudo actualizar la sede." });
  }
});

module.exports = router;
