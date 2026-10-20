// Protección contra CSRF y peticiones no legítimas en métodos que modifican datos.
// 1) Exige la cabecera personalizada X-Requested-With (un sitio externo no puede enviarla sin CORS,
//    y este servidor no habilita CORS).  2) Si viene Origin, debe ser el mismo host.
// 3) POST/PUT/PATCH deben enviar JSON.  Se suma a SameSite=Strict de la cookie.
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
    if (host !== req.get('Host')) return next(new AppError(403, 'Origen no permitido', 'CSRF'));
  }
  if (CON_CUERPO.has(req.method) && !/^application\/json/i.test(req.get('Content-Type') || '')) {
    return next(new AppError(415, 'El contenido debe enviarse como JSON', 'TIPO_CONTENIDO'));
  }
  next();
};