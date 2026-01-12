require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const mongoose = require("mongoose");

const { connectDB } = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const sedesRoutes = require("./routes/sedes.routes");

const app = express();

// Endurece filtros en mongoose (mitiga operadores maliciosos en queries)
mongoose.set("sanitizeFilter", true);

// Seguridad headers
app.disable("x-powered-by");
app.use(helmet());

// Parseo + límites
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());

// Quita keys peligrosas en body/query/params: $ y .
app.use(
  mongoSanitize({
    replaceWith: "_",
  })
);

// 🌍 CORS abierto para cualquier origen (incluye Postman, curl, etc.)
const corsOptions = {
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/sedes", sedesRoutes);

app.get("/", (req, res) => {
  res.send("🚀 users-service (auth + usuarios) OK");
});

const port = process.env.PORT || 4001;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`🟢 users-service escuchando en puerto ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error al conectar DB:", err);
    process.exit(1);
  });
