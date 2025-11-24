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
