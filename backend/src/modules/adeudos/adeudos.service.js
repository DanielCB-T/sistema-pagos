const { query } = require('../../config/db');
const AppError = require('../../utils/AppError');
const v = require('../../utils/validators');
const { likePattern } = require('../../utils/sql');

const ESTADOS = ['pendiente', 'parcial', 'pagado'];
const SELECT = `SELECT a.id_adeudo, a.monto_total, a.monto_pagado, a.monto_pendiente, a.estado,
                       a.id_habitante, h.nombre_completo, h.numero_familia
                  FROM adeudo a JOIN habitante h ON h.id_habitante = a.id_habitante`;

// Expresión SQL que deriva el estado a partir de total y pagado
const ESTADO_SQL = (total, pagado) => `CASE
  WHEN ${total} - ${pagado} = 0 THEN 'pagado'
  WHEN ${pagado} > 0 THEN 'parcial'
  ELSE 'pendiente' END`;

async function listar(f = {}) {
  const cond = [];
  const params = [];
  if (f.q && String(f.q).trim()) {
    params.push(likePattern(f.q));
    cond.push(`(h.nombre_completo ILIKE $${params.length} OR h.numero_familia ILIKE $${params.length})`);
  }
  if (f.id_habitante) { params.push(v.entero(f.id_habitante, 'Habitante')); cond.push(`a.id_habitante = $${params.length}`); }
  if (f.estado) { params.push(v.opcion(f.estado, 'El estado', ESTADOS)); cond.push(`a.estado = $${params.length}`); }
  if (f.abiertos === 'true') cond.push(`a.estado <> 'pagado'`);
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const { rows } = await query(
    `${SELECT} ${where} ORDER BY (a.estado = 'pagado'), h.nombre_completo, a.id_adeudo`, params);
  return rows;
}

async function obtener(id, exec = { query }) {
  const { rows } = await exec.query(`${SELECT} WHERE a.id_adeudo = $1`, [id]);
  if (!rows[0]) throw new AppError(404, 'El adeudo no existe', 'NOT_FOUND');
  return rows[0];
}

async function crear(body) {
  const idHab = v.entero(body.id_habitante, 'El habitante');
  const total = v.monto(body.monto_total, 'El monto total');
  const { rowCount } = await query('SELECT 1 FROM habitante WHERE id_habitante = $1', [idHab]);
  if (!rowCount) throw new AppError(404, 'El habitante no existe', 'NOT_FOUND');
  const { rows } = await query(
    `INSERT INTO adeudo (monto_total, monto_pagado, monto_pendiente, estado, id_habitante)
     VALUES ($1, 0, $1, 'pendiente', $2) RETURNING id_adeudo`,
    [total, idHab]
  );
  return obtener(rows[0].id_adeudo);
}

// Solo se puede modificar el monto total (nunca por debajo de lo ya pagado)
async function actualizar(id, body) {
  const total = v.monto(body.monto_total, 'El monto total');
  const { rows } = await query(
    `UPDATE adeudo
        SET monto_total = $2::numeric,
            monto_pendiente = $2::numeric - monto_pagado,
            estado = ${ESTADO_SQL('$2::numeric', 'monto_pagado')}
      WHERE id_adeudo = $1 AND $2::numeric >= monto_pagado
      RETURNING id_adeudo`,
    [id, total]
  );
  if (!rows[0]) {
    await obtener(id); // lanza 404 si no existe
    throw new AppError(409, 'El monto total no puede ser menor a lo ya pagado', 'CONFLICTO');
  }
  return obtener(id);
}

async function eliminar(id) {
  await obtener(id);
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM pago WHERE id_adeudo = $1', [id]);
  if (rows[0].n) throw new AppError(409, 'El adeudo tiene pagos registrados y no puede eliminarse', 'RELACIONADO');
  await query('DELETE FROM adeudo WHERE id_adeudo = $1', [id]);
}

/**
 * Suma (o resta si es negativo) `delta` al monto pagado y recalcula pendiente y estado.
 * Debe llamarse dentro de una transacción (recibe el client). Bloquea la fila (FOR UPDATE).
 * Lo usa el módulo de pagos: "Actualizar adeudo" del caso de uso Registrar pago.
 */
async function aplicarMovimiento(client, idAdeudo, delta, { idHabitante } = {}) {
  const { rows } = await client.query(
    'SELECT id_habitante FROM adeudo WHERE id_adeudo = $1 FOR UPDATE', [idAdeudo]);
  if (!rows[0]) throw new AppError(404, 'El adeudo no existe', 'NOT_FOUND');
  if (idHabitante && rows[0].id_habitante !== idHabitante) {
    throw new AppError(400, 'El adeudo no pertenece al habitante seleccionado', 'VALIDACION');
  }
  const nuevo = await client.query(
    `UPDATE adeudo
        SET monto_pagado = monto_pagado + $2::numeric,
            monto_pendiente = monto_total - (monto_pagado + $2::numeric),
            estado = ${ESTADO_SQL('monto_total', '(monto_pagado + $2::numeric)')}
      WHERE id_adeudo = $1 AND monto_pagado + $2::numeric BETWEEN 0 AND monto_total
      RETURNING id_adeudo`,
    [idAdeudo, delta]
  );
  if (!nuevo.rowCount) throw new AppError(409, 'El monto excede el saldo pendiente del adeudo', 'CONFLICTO');
}

module.exports = { listar, obtener, crear, actualizar, eliminar, aplicarMovimiento };
