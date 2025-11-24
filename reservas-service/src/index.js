require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { connectDB } = require('./config/db');

const habitacionesRoutes = require('./routes/habitaciones.routes');
const reservasRoutes = require('./routes/reservas.routes');

const app = express();

app.use(express.json());
app.use(cookieParser());

// 🌍 CORS abierto para cualquier origen (solo para desarrollo)
const corsOptions = {
  origin: (origin, callback) => {
    // Acepta cualquier origen (incluye Postman, curl, etc.)
    callback(null, true);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use('/api/habitaciones', habitacionesRoutes);
app.use('/api/reservas', reservasRoutes);

app.get('/', (req, res) => {
  res.send('🏨 reservas-service (habitaciones + reservas) OK con nodemon funcionando');
});

const port = process.env.PORT || 4002;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`🟢 reservas-service escuchando en puerto ${port}`);
    });
  })
  .catch(err => {
    console.error('❌ Error al conectar DB:', err);
    process.exit(1);
  });
