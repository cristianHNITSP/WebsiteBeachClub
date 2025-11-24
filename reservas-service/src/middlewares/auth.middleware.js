// middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // 1) Intentar por Authorization: Bearer
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2) Si no hay en header, intentar por cookie (ej: auth_token)
  if (!token && req.cookies) {
    token = req.cookies.auth_token; // 👈 AJUSTA el nombre si usas otro
  }

  if (!token) {
    return res.status(401).json({
      error: 'NO_TOKEN',
      message: 'No autorizado: token no proporcionado',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // payload típico: { id, email, role, iat, exp }
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'Sesión expirada.',
      });
    }
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Token inválido.',
    });
  }
}

module.exports = authMiddleware;
