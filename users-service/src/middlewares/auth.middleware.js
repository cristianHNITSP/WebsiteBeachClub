const jwt = require('jsonwebtoken');

/**
 * Middleware que verifica el JWT en la cookie `auth_token`
 * o en el header Authorization: Bearer <token>
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  const token = req.cookies?.auth_token || tokenFromHeader;

  if (!token) {
    return res.status(401).json({
      error: 'NO_TOKEN',
      message: 'No autorizado: token no proporcionado'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'La sesión ha expirado. Inicia sesión nuevamente.'
      });
    }
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Token inválido o manipulado.'
    });
  }
}

module.exports = authMiddleware;
