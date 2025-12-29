const express = require("express");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const auth = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/permissions.middleware");

const router = express.Router();

const fold = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function levenshtein(a, b) {
  a = a || ""; b = b || "";
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;

  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1,      // delete
        dp[j - 1] + 1,  // insert
        prev + cost     // replace
      );
      prev = tmp;
    }
  }
  return dp[n];
}

function fuzzyRank(items, queryRaw) {
  const q = fold(queryRaw);
  if (!q) return items;

  const tokens = q.split(" ").filter(Boolean);
  const qLen = q.length;

  const maxErrFor = (len) => {
    if (len <= 3) return 0;
    if (len <= 5) return 1;
    if (len <= 8) return 2;
    return Math.ceil(len * 0.28); // más largo, permite poquito más
  };

  const scored = [];
  for (const it of items) {
    const name = fold(it.name);
    if (!name) continue;

    // si contiene exacto (normalizado), top score
    if (name.includes(q)) {
      scored.push({ it, score: 0, hit: 0 });
      continue;
    }

    const words = name.split(" ").filter(Boolean);
    let sum = 0;
    let worst = 0;

    for (const t of tokens) {
      let best = Infinity;

      // contra cada palabra
      for (const w of words) {
        const d = levenshtein(t, w);
        if (d < best) best = d;
        if (best === 0) break;
      }

      // contra nombre completo (a veces ayuda)
      best = Math.min(best, levenshtein(t, name));

      sum += best;
      worst = Math.max(worst, best);
    }

    const maxErrToken = Math.max(...tokens.map((t) => maxErrFor(t.length)));
    const maxErrQuery = maxErrFor(qLen);

    // filtro: tolera typos leves
    if (worst <= maxErrToken && sum <= maxErrQuery + maxErrToken) {
      scored.push({ it, score: sum, hit: worst });
    }
  }

  scored.sort((a, b) => a.score - b.score || a.hit - b.hit || String(a.it.name).localeCompare(String(b.it.name)));
  return scored.map((x) => x.it);
}

// GET /api/shop/products?site=&section=&categoryId=&search=
router.get("/", auth, requirePermissions(["view_shop"]), async (req, res) => {
  const { site, section, categoryId, search, onlyActive = "1" } = req.query;

  const q = { isDeleted: false };
  if (site) q.site = String(site);
  if (section) q.section = section;
  if (categoryId) q.categoryId = categoryId;
  if (onlyActive === "1") q.active = true;

  const s = String(search || "").trim();

  // 1) si no hay búsqueda: normal
  if (!s) {
    const items = await Product.find(q).sort({ name: 1 }).limit(500).lean();
    return res.json({ items });
  }

  // 2) intento $text (si está bien escrito)
  let itemsText = [];
  try {
    itemsText = await Product.find({ ...q, $text: { $search: s } })
      .sort({ score: { $meta: "textScore" } })
      .limit(120)
      .lean();
  } catch {
    // si por algo falla $text, ignoramos y seguimos con fuzzy
    itemsText = [];
  }

  // 3) fuzzy fallback (tolera typos)
  // Traemos candidatos filtrados por site/section/category/active
  const candidates = await Product.find(q).limit(2000).lean();
  const itemsFuzzy = fuzzyRank(candidates, s).slice(0, 500);

  // 4) merge: primero los $text, luego los fuzzy (sin duplicar)
  const seen = new Set();
  const merged = [];

  for (const it of itemsText) {
    const id = String(it._id);
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(it);
    }
  }
  for (const it of itemsFuzzy) {
    const id = String(it._id);
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(it);
    }
    if (merged.length >= 500) break;
  }

  res.json({ items: merged });
});

// POST /api/shop/products
router.post("/", auth, requirePermissions(["manage_shop"]), async (req, res) => {
  const b = req.body || {};
  const required = ["name", "section", "categoryId", "site", "unitPrice", "stock"];
  for (const k of required) {
    if (b[k] === undefined || b[k] === null || b[k] === "") {
      return res.status(400).json({ message: `${k} es requerido` });
    }
  }

  const created = await Product.create({
    name: String(b.name).trim(),
    section: b.section,
    categoryId: b.categoryId,
    site: String(b.site).trim(),
    unitPrice: Number(b.unitPrice),
    stock: Number(b.stock),
    minStock: Number(b.minStock || 0),
    imageUrl: String(b.imageUrl || ""),
    active: b.active !== false,
  });

  res.status(201).json({ item: created });
});

// PATCH /api/shop/products/:id
router.patch("/:id", auth, requirePermissions(["manage_shop"]), async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};

  const patch = {};
  if (b.name !== undefined) patch.name = String(b.name).trim();
  if (b.section !== undefined) patch.section = b.section;
  if (b.categoryId !== undefined) patch.categoryId = b.categoryId;
  if (b.site !== undefined) patch.site = String(b.site).trim();
  if (b.unitPrice !== undefined) patch.unitPrice = Number(b.unitPrice);
  if (b.stock !== undefined) patch.stock = Math.max(0, Number(b.stock));
  if (b.minStock !== undefined) patch.minStock = Math.max(0, Number(b.minStock));
  if (b.imageUrl !== undefined) patch.imageUrl = String(b.imageUrl || "");
  if (b.active !== undefined) patch.active = !!b.active;

  const updated = await Product.findByIdAndUpdate(id, patch, { new: true });
  if (!updated) return res.status(404).json({ message: "Producto no encontrado" });

  res.json({ item: updated });
});

// POST /api/shop/products/:id/stock-adjust { delta, reason }
router.post("/:id/stock-adjust", auth, requirePermissions(["manage_shop"]), async (req, res) => {
  const { id } = req.params;
  const { delta, reason } = req.body || {};

  const d = Number(delta);
  if (!Number.isFinite(d) || d === 0) {
    return res.status(400).json({ message: "delta inválido" });
  }

  const p = await Product.findById(id);
  if (!p || p.isDeleted) return res.status(404).json({ message: "Producto no encontrado" });

  const before = p.stock;
  const after = Math.max(0, before + d);
  p.stock = after;
  await p.save();

  await StockMovement.create({
    site: p.site,
    productId: p._id,
    type: d > 0 ? "restock" : "adjustment",
    delta: d,
    before,
    after,
    reason: String(reason || ""),
    createdBy: {
      id: String(req.user?.id || ""),
      email: String(req.user?.email || ""),
      role: String(req.user?.role || ""),
    },
  });

  res.json({ item: p });
});

// 🧺 GET /api/shop/products/trash?site=&section=
router.get("/trash", auth, requirePermissions(["manage_shop"]), async (req, res) => {
  const { site, section } = req.query;

  const q = { isDeleted: true };
  if (site) q.site = String(site);
  if (section) q.section = String(section);

  const items = await Product.find(q).sort({ updatedAt: -1, name: 1 }).limit(500).lean();
  res.json({ items });
});

// ♻️ PATCH /api/shop/products/:id/restore
router.patch("/:id/restore", auth, requirePermissions(["manage_shop"]), async (req, res) => {
  const { id } = req.params;
  const updated = await Product.findByIdAndUpdate(id, { isDeleted: false }, { new: true });
  if (!updated) return res.status(404).json({ message: "Producto no encontrado" });
  res.json({ item: updated });
});

// DELETE (soft) /api/shop/products/:id
router.delete("/:id", auth, requirePermissions(["manage_shop"]), async (req, res) => {
  const { id } = req.params;
  const updated = await Product.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  if (!updated) return res.status(404).json({ message: "Producto no encontrado" });
  res.json({ ok: true });
});

module.exports = router;
