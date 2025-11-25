require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const { connectDB } = require("./config/db");
const createHabitacionesRouter = require("./routes/habitaciones.routes");
const reservasRoutes = require("./routes/reservas.routes");
const heroSlideRoutes = require("./routes/heroSlide.routes");
const Habitacion = require("./models/Habitacion");

const app = express();

app.use(express.json());
app.use(cookieParser());

// 🌍 CORS para HTTP
const corsOptions = {
  origin: (origin, callback) => {
    // En dev, acepta cualquier origen (ajusta esto en producción)
    callback(null, true);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/**
 * 🧠 MODELO DE CHAT + ESTADOS DE RESERVA (RESUMEN)
 *
 * - El chat NO es persistente:
 *   - Los mensajes solo viven en el frontend (estado de React).
 *   - Al cerrar/recargar, la conversación se descarta.
 *
 * - Lo ÚNICO persistente es el estado de la habitación:
 *   - estadoDeReserva = 0 → No reservada / disponible
 *   - estadoDeReserva = 1 → Reservada (confirmada)
 *   - estadoDeReserva = 3 → En espera (chat iniciado, reserva en proceso)
 *
 * - Flujo típico (website público, cliente NO autenticado):
 *
 *   1) Usuario hace "Reserva express" desde el sitio:
 *      - POST /api/habitaciones/:id/reserva-express
 *        → valida que la habitación esté libre
 *        → estadoDeReserva = 3
 *        → se guarda el hash de la IP en habitacion.reservaIpHashes
 *        → se abre el chat en el frontend asociado a esa habitación.
 *
 *   2) Usuario cierra el chat sin confirmar:
 *      - POST /api/habitaciones/:id/reserva-express/liberar
 *        → elimina su hash de reservaIpHashes
 *        → si ya no queda ningún hash, estadoDeReserva = 0 (disponible)
 *
 *   3) Staff confirma la reserva desde el panel (autenticado):
 *      - PATCH /api/habitaciones/:id/estado-reserva
 *        → 0 (no reservada), 1 (reservada) o 3 (en espera)
 *        → si se pasa a 0 o 1, se limpia reservaIpHashes
 *
 * - Control anti abuso:
 *   - Se usa un hash de la IP del cliente:
 *       req.clientIp       → IP normalizada (no se persiste en BD)
 *       req.clientIpHash   → Hash SHA-256(IP + SALT)
 *   - Las rutas públicas de reserva express sólo permiten:
 *       - Tomar la habitación si está libre.
 *       - Volver a entrar si el mismo hash ya la tenía en espera.
 *       - O rechazar si otra IP la tiene en espera.
 */

// 🔐 Helpers para IP + hash
const getClientIp = (req) => {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    // Si viene una lista "ip1, ip2, ip3" nos quedamos con la primera
    return xff.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || null;
};

const hashIp = (ip) => {
  if (!ip) return null;
  const salt = process.env.IP_SALT || "beachclub-ip-salt";
  return crypto.createHash("sha256").update(ip + salt).digest("hex");
};

// 🔐 Middleware global: adjunta IP normalizada y hash al request
app.use((req, res, next) => {
  const ip = getClientIp(req);
  req.clientIp = ip;
  req.clientIpHash = ip ? hashIp(ip) : null;
  next();
});

// 🔌 Servidor HTTP + Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Igual que arriba: en dev, acepta todo
      callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

// 🎧 Canal WebSocket
io.on("connection", async (socket) => {
  console.log("🧩 Cliente WebSocket conectado:", socket.id);

  try {
    // Enviar SOLO las primeras 5 habitaciones al conectar
    const rooms = await Habitacion.find().limit(5);
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

// 🔗 Rutas HTTP
// 👉 createHabitacionesRouter(io) podrá leer req.clientIpHash en los handlers
app.use("/api/habitaciones", createHabitacionesRouter(io));
app.use("/api/reservas", reservasRoutes);
app.use("/api/hero-slides", heroSlideRoutes);

app.get("/", (req, res) => {
  res.send(
    "🏨 reservas-service (habitaciones + reservas) OK con nodemon + Socket.IO"
  );
});

const port = process.env.PORT || 4002;

connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(
        `🟢 reservas-service escuchando en puerto ${port} con Socket.IO`
      );
    });
  })
  .catch((err) => {
    console.error("❌ Error al conectar DB:", err);
    process.exit(1);
  });
