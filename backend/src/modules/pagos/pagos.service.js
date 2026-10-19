const { query, withTransaction } = require('../../config/db');
const AppError = require('../../utils/AppError');
const v = require('../../utils/validators');
const { likePattern, paginacion } = require('../../utils/sql');
const adeudos = require('../adeudos/adeudos.service');

const SELECT = `SELECT p.id_pago, p.monto, p.concepto, p.fecha, p.observaciones,
                       p.id_habitante, p.id_usuario, p.id_adeudo,
                       h.nombre_completo, h.numero_familia,
                       u.nombre_usuario AS registrado_por
                  FROM pago p
                  JOIN habitante h ON h.id_habitante = p.id_habitante
                  JOIN usuario u ON u.id_usuario = p.id_usuario`;

// Consultar pago: buscar (q) + filtrar (habitante, rango de fechas), con paginación
async function listar(f = {}) {
  const cond = [];
  const params = [];
  if (f.q && String(f.q).trim()) {
    params.push(likePattern(f.q));
    const n = params.length;
    let c = `h.nombre_completo ILIKE $${n} OR p.concepto ILIKE $${n} OR h.numero_familia ILIKE $${n}`;
    if (/^\d{1,9}$/.test(String(f.q).trim())) { params.push(Number(f.q)); c += ` OR p.id_pago = $${params.length}`; }
    cond.push(`(${c})`);
  }
  if (f.id_habitante) { params.push(v.entero(f.id_habitante, 'Habitante')); cond.push(`p.id_habitante = $${params.length}`); }
  if (f.desde) { params.push(v.fecha(f.desde, 'La fecha inicial')); cond.push(`p.fecha >= $${params.length}`); }
  if (f.hasta) { params.push(v.fecha(f.hasta, 'La fecha final')); cond.push(`p.fecha <= $${params.length}`); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const { page, pageSize, limit, offset } = paginacion(f);

  const resumen = await query(
    `SELECT COUNT(*)::int AS total, COALESCE(SUM(p.monto), 0)::text AS suma
       FROM pago p JOIN habitante h ON h.id_habitante = p.id_habitante ${where}`, params);
  const { rows } = await query(
    `${SELECT} ${where} ORDER BY p.fecha DESC, p.id_pago DESC LIMIT ${limit} OFFSET ${offset}`, params);
  return { data: rows, total: resumen.rows[0].total, suma: resumen.rows[0].suma, page, pageSize };
}

async function obtener(id, exec = { query }) {
  const { rows } = await exec.query(`${SELECT} WHERE p.id_pago = $1`, [id]);
  if (!rows[0]) throw new AppError(404, 'El pago no existe', 'NOT_FOUND');
  return rows[0];
}

// Comprobante: datos del pago + saldo actual del adeudo asociado
async function obtenerParaComprobante(id) {
  const pago = await obtener(id);
  let saldo = null;
  if (pago.id_adeudo) {
    const { rows } = await query('SELECT monto_pendiente FROM adeudo WHERE id_adeudo = $1', [pago.id_adeudo]);
    saldo = rows[0] ? rows[0].monto_pendiente : null;
  }
  return { ...pago, saldo_adeudo: saldo };
}

async function validarFechaNoFutura(client, fecha) {
  if (!fecha) return;
  const { rows } = await client.query('SELECT CURRENT_DATE::text AS hoy');
  if (fecha > rows[0].hoy) throw v.bad('La fecha del pago no puede ser futura');
}

// Registrar pago = validar pago + consultar adeudo + actualizar adeudo (todo en una transacción)
async function crear(body, actor) {
  const idHab = v.entero(body.id_habitante, 'El habitante');
  const idAdeudo = v.entero(body.id_adeudo, 'El adeudo', { requerido: false });
  const monto = v.monto(body.monto, 'El monto');
  const concepto = v.texto(body.concepto, 'El concepto', { requerido: true, max: 100 });
  const observaciones = v.texto(body.observaciones, 'Las observaciones', { max: 1000 });
  const fecha = v.fecha(body.fecha, 'La fecha');

  return withTransaction(async (c) => {
    const hab = await c.query('SELECT 1 FROM habitante WHERE id_habitante = $1', [idHab]);
    if (!hab.rowCount) throw new AppError(404, 'El habitante no existe', 'NOT_FOUND');
    await validarFechaNoFutura(c, fecha);
    if (idAdeudo) await adeudos.aplicarMovimiento(c, idAdeudo, monto, { idHabitante: idHab });
    const { rows } = await c.query(
      `INSERT INTO pago (monto, concepto, fecha, observaciones, id_habitante, id_usuario, id_adeudo)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5, $6, $7) RETURNING id_pago`,
      [monto, concepto, fecha, observaciones, idHab, actor.id_usuario, idAdeudo]
    );
    return obtener(rows[0].id_pago, c);
  });
}

// Modificar pago: el habitante y el adeudo no cambian; si cambia el monto se reajusta el adeudo
async function actualizar(id, body) {
  const monto = v.monto(body.monto, 'El monto');
  const concepto = v.texto(body.concepto, 'El concepto', { requerido: true, max: 100 });
  const observaciones = v.texto(body.observaciones, 'Las observaciones', { max: 1000 });
  const fecha = v.fecha(body.fecha, 'La fecha');

  return withTransaction(async (c) => {
    const { rows } = await c.query('SELECT id_pago, monto, id_adeudo FROM pago WHERE id_pago = $1 FOR UPDATE', [id]);
    const actual = rows[0];
    if (!actual) throw new AppError(404, 'El pago no existe', 'NOT_FOUND');
    await validarFechaNoFutura(c, fecha);
    if (actual.id_adeudo) {
      const d = await c.query('SELECT ($1::numeric - $2::numeric)::text AS delta', [monto, actual.monto]);
      if (Number(d.rows[0].delta) !== 0) await adeudos.aplicarMovimiento(c, actual.id_adeudo, d.rows[0].delta);
    }
    await c.query(
      `UPDATE pago SET monto=$2, concepto=$3, observaciones=$4, fecha=COALESCE($5::date, fecha) WHERE id_pago=$1`,
      [id, monto, concepto, observaciones, fecha]
    );
    return obtener(id, c);
  });
}

// Eliminar pago: revierte su efecto sobre el adeudo
async function eliminar(id) {
  await withTransaction(async (c) => {
    const { rows } = await c.query('SELECT monto, id_adeudo FROM pago WHERE id_pago = $1 FOR UPDATE', [id]);
    const p = rows[0];
    if (!p) throw new AppError(404, 'El pago no existe', 'NOT_FOUND');
    if (p.id_adeudo) await adeudos.aplicarMovimiento(c, p.id_adeudo, `-${p.monto}`);
    await c.query('DELETE FROM pago WHERE id_pago = $1', [id]);
  });
}

module.exports = { listar, obtener, obtenerParaComprobante, crear, actualizar, eliminar };
