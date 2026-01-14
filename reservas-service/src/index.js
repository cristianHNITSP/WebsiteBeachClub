// src/index.js
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path"); // 

const { connectDB } = require("./config/db");
const createHabitacionesRouter = require("./routes/habitaciones.routes");
const reservasRoutes = require("./routes/reservas.routes");
const heroSlideRoutes = require("./routes/heroSlide.routes");
const publicReservasRouter = require("./routes/public.reservas.router");
const sedesRoutes = require("./routes/sedes.routes");

const Habitacion = require("./models/Habitacion");
const { bindHabitacionesSocket } = require("./ws/habitaciones.socket");

const app = express();

// ✅ importante si estás detrás de Nginx/Proxy (para req.protocol correcto)
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());

// 🌍 CORS para HTTP
const corsOptions = {
  origin: (origin, callback) => callback(null, true),
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ✅ SERVIR UPLOADS (esto hace que /uploads/habitaciones/xxx.jpg funcione)
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "7d",
    etag: true,
  })
);

// 🔌 Servidor HTTP + Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

// 🎧 Canal WebSocket
io.on("connection", async (socket) => {
  console.log("🧩 Cliente WebSocket conectado:", socket.id);

  try {
    const rooms = await Habitacion.find().sort({ createdAt: -1 }).limit(5);
    socket.emit("habitaciones:init", rooms);
  } catch (err) {
    console.error("Error al obtener habitaciones para WS:", err);
    socket.emit("habitaciones:error", {
      message: "No se pudieron cargar las habitaciones iniciales.",
    });
  }

  socket.on("disconnect", () => {
    console.log("❌ Cliente WebSocket desconectado:", socket.id);
  });
});

bindHabitacionesSocket(io);

// 🔗 Rutas HTTP
app.use("/api/habitaciones", createHabitacionesRouter(io));
app.use("/api/reservas", reservasRoutes);
app.use("/api/hero-slides", heroSlideRoutes);
app.use("/api/public", publicReservasRouter);
app.use("/api/reservas/sedes", sedesRoutes);

app.get("/", (req, res) => {
  res.send("🏨 reservas-service (habitaciones + reservas) OK con Socket.IO");
});

const port = process.env.PORT || 4002;

connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`🟢 reservas-service escuchando en puerto ${port} con Socket.IO`);
    });
  })
  .catch((err) => {
    console.error("❌ Error al conectar DB:", err);
    process.exit(1);
  });
