// Bitácora de seguridad (backend/data/auditoria.log, una línea JSON por evento).
// Registra: toda operación que modifica datos y todo acceso rechazado (401, 403, 429).
// Nunca guarda contraseñas ni el cuerpo de las peticiones.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', 'data');
const ARCHIVO = path.join(DIR, 'auditoria.log');
try { fs.mkdirSync(DIR, { recursive: true }); } catch { /* sin permisos: se omite la bitácora */ }

module.exports = (req, res, next) => {
  res.on('finish', () => {
    const modifica = req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS';
    const rechazo = [401, 403, 429].includes(res.statusCode);
    if (!modifica && !rechazo) return;
    const evento = {
      fecha: new Date().toISOString(),
      ip: req.ip,
      usuario: req.user ? req.user.nombre_usuario : (req.originalUrl.includes('/auth/login') ? String((req.body && req.body.nombre_usuario) || '').slice(0, 50) : null),
      metodo: req.method,
      ruta: req.originalUrl.split('?')[0],
      estado: res.statusCode,
    };
    fs.appendFile(ARCHIVO, `${JSON.stringify(evento)}\n`, () => {});
  });
  next();
};