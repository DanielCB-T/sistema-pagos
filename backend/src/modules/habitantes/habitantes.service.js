const { query } = require('../../config/db');
const AppError = require('../../utils/AppError');
const v = require('../../utils/validators');
const { likePattern } = require('../../utils/sql');

const COLS = 'id_habitante, nombre_completo, direccion, telefono, numero_familia';

function validar(body) {
  return {
    nombre: v.texto(body.nombre_completo, 'El nombre completo', { requerido: true, min: 3, max: 100 }),
    direccion: v.texto(body.direccion, 'La dirección', { max: 500 }),
    telefono: v.texto(body.telefono, 'El teléfono', {
      max: 15, patron: /^[0-9+\-\s()]{7,15}$/, mensajePatron: 'El teléfono debe tener entre 7 y 15 dígitos',
    }),
    familia: v.texto(body.numero_familia, 'El número de familia', { max: 20 }),
  };
}

async function listar({ q } = {}) {
  const params = [];
  let where = '';
  if (q && String(q).trim()) {
    params.push(likePattern(q));
    where = `WHERE nombre_completo ILIKE $1 OR numero_familia ILIKE $1 OR telefono ILIKE $1 OR direccion ILIKE $1`;
  }
  const { rows } = await query(`SELECT ${COLS} FROM habitante ${where} ORDER BY nombre_completo`, params);
  return rows;
}

async function obtener(id) {
  const { rows } = await query(`SELECT ${COLS} FROM habitante WHERE id_habitante = $1`, [id]);
  if (!rows[0]) throw new AppError(404, 'El habitante no existe', 'NOT_FOUND');
  return rows[0];
}

async function crear(body) {
  const d = validar(body);
  const { rows } = await query(
    `INSERT INTO habitante (nombre_completo, direccion, telefono, numero_familia)
     VALUES ($1,$2,$3,$4) RETURNING ${COLS}`,
    [d.nombre, d.direccion, d.telefono, d.familia]
  );
  return rows[0];
}

async function actualizar(id, body) {
  const d = validar(body);
  const { rows } = await query(
    `UPDATE habitante SET nombre_completo=$2, direccion=$3, telefono=$4, numero_familia=$5
      WHERE id_habitante=$1 RETURNING ${COLS}`,
    [id, d.nombre, d.direccion, d.telefono, d.familia]
  );
  if (!rows[0]) throw new AppError(404, 'El habitante no existe', 'NOT_FOUND');
  return rows[0];
}

async function eliminar(id) {
  await obtener(id);
  const { rows } = await query(
    `SELECT (SELECT COUNT(*) FROM pago WHERE id_habitante = $1)::int AS pagos,
            (SELECT COUNT(*) FROM adeudo WHERE id_habitante = $1)::int AS adeudos`,
    [id]
  );
  if (rows[0].pagos || rows[0].adeudos) {
    throw new AppError(409, 'El habitante tiene pagos o adeudos registrados y no puede eliminarse', 'RELACIONADO');
  }
  await query('DELETE FROM habitante WHERE id_habitante = $1', [id]);
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
