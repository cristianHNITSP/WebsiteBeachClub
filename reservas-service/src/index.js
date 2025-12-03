require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const { connectDB } = require("./config/db");
const createHabitacionesRouter = require("./routes/habitaciones.routes");
const reservasRoutes = require("./routes/reservas.routes");
const heroSlideRoutes = require("./routes/heroSlide.routes");
const Habitacion = require("./models/Habitacion");
const { bindHabitacionesSocket } = require("./ws/habitaciones.socket");

const app = express();

app.use(express.json());
app.use(cookieParser());

// 🌍 CORS para HTTP
const corsOptions = {
  origin: (origin, callback) => callback(null, true), // dev: permitir todo
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/**
 * ✅ MODELO SIMPLE (RESUMEN)
 * - Chat NO modifica estados.
 * - Lo único persistente de reserva es:
 *      isReserved = true/false
 * - El staff actualiza:
 *      - inventoryStatus (Activa/Mantenimiento/Fuera/etc.)
 *      - isReserved (Reservada/No reservada)
 * - WebSocket solo sincroniza cambios en tiempo real.
 */

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
    // Enviar SOLO las primeras 5 habitaciones al conectar (preview)
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
// ✅ binder WS
bindHabitacionesSocket(io);

// 🔗 Rutas HTTP
app.use("/api/habitaciones", createHabitacionesRouter(io));
app.use("/api/reservas", reservasRoutes);
app.use("/api/hero-slides", heroSlideRoutes);

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
