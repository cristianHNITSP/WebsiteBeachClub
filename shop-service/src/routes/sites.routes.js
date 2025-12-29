const express = require("express");
const Product = require("../models/Product");
const auth = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/permissions.middleware");

const router = express.Router();

// GET /api/shop/sites
router.get("/", auth, requirePermissions(["view_shop"]), async (req, res) => {
  const sites = await Product.distinct("site", { isDeleted: false });
  sites.sort();
  res.json({ items: sites });
});

module.exports = router;
