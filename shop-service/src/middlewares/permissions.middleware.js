// middlewares/permissions.middleware.js
/**
 * requirePermissions(['perm1', 'perm2'])
 * Verifica que el usuario autenticado tenga TODOS esos permisos.
 * Asume que authMiddleware ya llenó req.user con { id, email, role, permissions }
 */
function requirePermissions(requiredPermissions = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'NOT_AUTHENTICATED',
        message: 'No hay usuario autenticado en la petición.'
      });
    }

    const userPerms = Array.isArray(req.user.permissions)
      ? req.user.permissions
      : [];

    const hasAll = requiredPermissions.every((p) => userPerms.includes(p));

    if (!hasAll) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'No tienes permisos suficientes para realizar esta acción.',
        required: requiredPermissions,
        current: userPerms
      });
    }

    next();
  };
}

module.exports = { requirePermissions };
