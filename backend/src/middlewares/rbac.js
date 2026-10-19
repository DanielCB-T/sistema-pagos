// Control de acceso por permiso: requierePermiso('pagos:crear') (basta con tener uno de los indicados)
const AppError = require('../utils/AppError');

const requierePermiso = (...permisos) => (req, res, next) => {
  const tiene = req.user && permisos.some((p) => req.user.permisos.includes(p));
  if (!tiene) return next(new AppError(403, 'No tiene permiso para realizar esta acción', 'FORBIDDEN'));
  next();
};

module.exports = { requierePermiso };
