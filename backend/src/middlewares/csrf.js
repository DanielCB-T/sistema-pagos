// Protección contra CSRF y peticiones no legítimas en métodos que modifican datos.
const AppError = require('../utils/AppError');

const SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CON_CUERPO = new Set(['POST', 'PUT', 'PATCH']);

module.exports = (req, res, next) => {
  if (SEGUROS.has(req.method)) return next();
  if (req.get('X-Requested-With') !== 'sgp') {
    return next(new AppError(403, 'Petición no permitida', 'CSRF'));
  }
  const origin = req.get('Origin');
  if (origin) {
    let host = null;
    try { host = new URL(origin).host; } catch { /* origin inválido */ }

    // Permitir si viene del mismo host O si proviene del dominio de Vercel
    const esMismoHost = host === req.get('Host');
    const esVercel = host === 'sistema-pagos-frontend.vercel.app';

    if (!esMismoHost && !esVercel) {
      return next(new AppError(403, 'Origen no permitido', 'CSRF'));
    }
  }
  if (CON_CUERPO.has(req.method) && !/^application\/json/i.test(req.get('Content-Type') || '')) {
    return next(new AppError(415, 'El contenido debe enviarse como JSON', 'TIPO_CONTENIDO'));
  }
  next();
};