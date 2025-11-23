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

app.use(
  cors({
    origin: ['http://localhost:5173'],
    credentials: true
  })
);

app.use('/api/habitaciones', habitacionesRoutes);
app.use('/api/reservas', reservasRoutes);

app.get('/', (req, res) => {
  res.send('🏨 reservas-service (habitaciones + reservas) OK');
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
