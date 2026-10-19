// Utilidades para construir consultas SQL de forma segura
const { entero } = require('./validators');

// Escapa comodines de LIKE y envuelve el texto: 'ana' -> '%ana%'
const likePattern = (q) => `%${String(q).trim().replace(/[\\%_]/g, '\\$&')}%`;

// Paginación validada (límite duro de 100 por página)
function paginacion({ page, pageSize } = {}) {
  const p = page ? entero(page, 'page') : 1;
  const size = Math.min(pageSize ? entero(pageSize, 'pageSize') : 25, 100);
  return { page: p, pageSize: size, limit: size, offset: (p - 1) * size };
}

module.exports = { likePattern, paginacion };
