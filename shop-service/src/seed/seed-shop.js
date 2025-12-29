// shop-service/src/seed/seed-shop.js
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");

// ✅ Nombres reales según tu repo:
const ShopCategory = require("../models/Category");
const ShopProduct = require("../models/Product");
// const ShopSale = require("../models/Sale");
// const ShopStockMovement = require("../models/StockMovement");

async function seedShop() {
  try {
    await connectDB();

    console.log("🧹 Limpiando colecciones SHOP...");
    await Promise.all([
      ShopProduct.deleteMany({}),
      ShopCategory.deleteMany({}),
      // ShopSale.deleteMany({}),
      // ShopStockMovement.deleteMany({}),
    ]);

    // ✅ tus sites son strings
    const SITES = ["casa_frida", "cabanas_fridas"];

    console.log("🧩 Insertando categorías...");
    const categoriesToInsert = [
      // NORMAL
      { name: "Bebidas", section: "normal" },
      { name: "Snacks", section: "normal" },
      { name: "Comida", section: "normal" },
      { name: "Higiene", section: "normal" },

      // ALCOHOL
      { name: "Cerveza", section: "alcohol" },
      { name: "Cocteles", section: "alcohol" },
      { name: "Botellas", section: "alcohol" },
    ].map((c) => ({ ...c, isDeleted: false }));

    const createdCategories = await ShopCategory.insertMany(categoriesToInsert);

    const catId = (section, name) =>
      createdCategories.find((c) => c.section === section && c.name === name)?._id;

    console.log("🛒 Insertando productos (por site)...");
    const productsBase = [
      // ---- NORMAL / Bebidas
      { name: "Agua 600ml", section: "normal", category: "Bebidas", unitPrice: 25, stock: 30 },
      { name: "Refresco 355ml", section: "normal", category: "Bebidas", unitPrice: 35, stock: 25 },
      { name: "Electrolit", section: "normal", category: "Bebidas", unitPrice: 45, stock: 20 },

      // ---- NORMAL / Snacks
      { name: "Papas clásicas", section: "normal", category: "Snacks", unitPrice: 35, stock: 18 },
      { name: "Cacahuates", section: "normal", category: "Snacks", unitPrice: 30, stock: 22 },

      // ---- NORMAL / Comida
      { name: "Sandwich", section: "normal", category: "Comida", unitPrice: 85, stock: 10 },
      { name: "Ensalada", section: "normal", category: "Comida", unitPrice: 95, stock: 8 },

      // ---- NORMAL / Higiene
      { name: "Bloqueador solar", section: "normal", category: "Higiene", unitPrice: 180, stock: 6 },

      // ---- ALCOHOL / Cerveza
      { name: "Cerveza (lata)", section: "alcohol", category: "Cerveza", unitPrice: 60, stock: 30 },

      // ---- ALCOHOL / Cocteles
      { name: "Mojito", section: "alcohol", category: "Cocteles", unitPrice: 140, stock: 999 },

      // ---- ALCOHOL / Botellas
      { name: "Botella (vodka)", section: "alcohol", category: "Botellas", unitPrice: 950, stock: 4 },
    ];

    const productsToInsert = [];

    for (const site of SITES) {
      for (const p of productsBase) {
        const categoryId = catId(p.section, p.category);
        if (!categoryId) {
          throw new Error(`No encontré categoryId para: [${p.section}] ${p.category}`);
        }

        productsToInsert.push({
          name: p.name,
          section: p.section,
          categoryId,
          site,
          unitPrice: p.unitPrice,
          stock: p.stock,
          minStock: 0,
          imageUrl: "",
          active: true,
          isDeleted: false,
        });
      }
    }

    await ShopProduct.insertMany(productsToInsert);

    console.log("✅ Seed SHOP OK");
    console.log("   Categories:", await ShopCategory.countDocuments());
    console.log("   Products:", await ShopProduct.countDocuments());
  } catch (err) {
    console.error("❌ seed-shop error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedShop();
