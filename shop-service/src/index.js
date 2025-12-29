// shop-service/src/index.js
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const { connectDB } = require("./config/db");

const categoriesRoutes = require("./routes/categories.routes");
const productsRoutes = require("./routes/products.routes");
const salesRoutes = require("./routes/sales.routes");
const sitesRoutes = require("./routes/sites.routes");
const stockMovementsRoutes = require("./routes/stockMovements");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// 🌍 CORS abierto (DEV)
const corsOptions = {
  origin: true, // refleja origin entrante
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.get("/api/shop/health", (req, res) =>
  res.json({ ok: true, service: "shop-service" })
);

app.use("/api/shop/categories", categoriesRoutes);
app.use("/api/shop/products", productsRoutes);
app.use("/api/shop/sales", salesRoutes);
app.use("/api/shop/stock-movements", stockMovementsRoutes);
app.use("/api/shop/sites", sitesRoutes);

const port = Number(process.env.PORT || 4003);

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`[shop-service] listening on ${port}`));
  })
  .catch((e) => {
    console.error("[shop-service] DB error:", e);
    process.exit(1);
  });
