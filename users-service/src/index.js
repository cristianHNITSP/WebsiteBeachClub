require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');

const app = express();

app.use(express.json());
app.use(cookieParser());

// CORS: ajusta origin a tu frontend
app.use(
  cors({
    origin: ['http://localhost:5173'],
    credentials: true
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

app.get('/', (req, res) => {
  res.send('🚀 users-service (auth + usuarios) OK');
});

const port = process.env.PORT || 4001;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`🟢 users-service escuchando en puerto ${port}`);
    });
  })
  .catch(err => {
    console.error('❌ Error al conectar DB:', err);
    process.exit(1);
  });
