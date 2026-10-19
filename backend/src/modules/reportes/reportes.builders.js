// Un "builder" por tipo de reporte. Para agregar un reporte nuevo:
//   1) crear aquí su función y registrarla en BUILDERS
//   2) agregar su etiqueta en la lista del frontend (frontend/js/views/reportes.js)
// Cada builder devuelve { titulo, columnas:[{key,label,tipo}], filas, resumen:[{label,valor,tipo}] }
const { query } = require('../../config/db');
const { sumar } = require('../../utils/money');

async function pagos({ fecha_inicio, fecha_fin }) {
  const { rows } = await query(
    `SELECT p.id_pago, p.fecha, h.nombre_completo AS habitante, p.concepto, p.monto,
            u.nombre_usuario AS registrado_por
       FROM pago p
       JOIN habitante h ON h.id_habitante = p.id_habitante
       JOIN usuario u ON u.id_usuario = p.id_usuario
      WHERE p.fecha BETWEEN $1 AND $2
      ORDER BY p.fecha, p.id_pago`,
    [fecha_inicio, fecha_fin]
  );
  return {
    titulo: 'Reporte de pagos',
    columnas: [
      { key: 'id_pago', label: 'Folio' },
      { key: 'fecha', label: 'Fecha', tipo: 'fecha' },
      { key: 'habitante', label: 'Habitante' },
      { key: 'concepto', label: 'Concepto' },
      { key: 'monto', label: 'Monto', tipo: 'moneda' },
      { key: 'registrado_por', label: 'Registró' },
    ],
    filas: rows,
    resumen: [
      { label: 'Pagos registrados', valor: rows.length },
      { label: 'Monto total', valor: sumar(rows, 'monto'), tipo: 'moneda' },
    ],
  };
}

async function adeudos() {
  const { rows } = await query(
    `SELECT a.id_adeudo, h.nombre_completo AS habitante, h.numero_familia AS familia,
            a.monto_total, a.monto_pagado, a.monto_pendiente, a.estado
       FROM adeudo a JOIN habitante h ON h.id_habitante = a.id_habitante
      ORDER BY (a.estado = 'pagado'), h.nombre_completo, a.id_adeudo`
  );
  return {
    titulo: 'Reporte de adeudos',
    columnas: [
      { key: 'id_adeudo', label: 'ID' },
      { key: 'habitante', label: 'Habitante' },
      { key: 'familia', label: 'Familia' },
      { key: 'monto_total', label: 'Total', tipo: 'moneda' },
      { key: 'monto_pagado', label: 'Pagado', tipo: 'moneda' },
      { key: 'monto_pendiente', label: 'Pendiente', tipo: 'moneda' },
      { key: 'estado', label: 'Estado' },
    ],
    filas: rows,
    resumen: [
      { label: 'Adeudos registrados', valor: rows.length },
      { label: 'Total pendiente', valor: sumar(rows, 'monto_pendiente'), tipo: 'moneda' },
    ],
  };
}

async function habitantes() {
  const { rows } = await query(
    `SELECT h.id_habitante, h.numero_familia AS familia, h.nombre_completo AS nombre,
            h.direccion, h.telefono,
            COALESCE((SELECT SUM(p.monto) FROM pago p WHERE p.id_habitante = h.id_habitante), 0)::text AS total_pagado,
            COALESCE((SELECT SUM(a.monto_pendiente) FROM adeudo a WHERE a.id_habitante = h.id_habitante), 0)::text AS total_pendiente
       FROM habitante h ORDER BY h.nombre_completo`
  );
  return {
    titulo: 'Reporte de habitantes',
    columnas: [
      { key: 'id_habitante', label: 'ID' },
      { key: 'familia', label: 'Familia' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'direccion', label: 'Dirección' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'total_pagado', label: 'Total pagado', tipo: 'moneda' },
      { key: 'total_pendiente', label: 'Pendiente', tipo: 'moneda' },
    ],
    filas: rows,
    resumen: [{ label: 'Habitantes registrados', valor: rows.length }],
  };
}

const BUILDERS = { pagos, adeudos, habitantes };
// Tipos que requieren rango de fechas
const REQUIERE_PERIODO = ['pagos'];

module.exports = { BUILDERS, REQUIERE_PERIODO };
