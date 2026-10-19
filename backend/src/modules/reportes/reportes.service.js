const { query } = require('../../config/db');
const AppError = require('../../utils/AppError');
const v = require('../../utils/validators');
const { BUILDERS, REQUIERE_PERIODO } = require('./reportes.builders');
const { aCSV } = require('./csv');

const TIPOS = Object.keys(BUILDERS);
const SELECT = `SELECT r.id_reporte, r.tipo_reporte, r.fecha_inicio, r.fecha_fin, r.fecha_generacion,
                       r.id_usuario, u.nombre_usuario AS generado_por
                  FROM reporte r JOIN usuario u ON u.id_usuario = r.id_usuario`;

async function armar(reporte) {
  const datos = await BUILDERS[reporte.tipo_reporte](reporte);
  return { reporte, ...datos };
}

// Generar reporte: valida parámetros, registra el reporte (tabla Reporte) y devuelve los datos
async function generar(body, actor) {
  const tipo = v.opcion(body.tipo_reporte, 'El tipo de reporte', TIPOS);
  const periodo = REQUIERE_PERIODO.includes(tipo);
  const inicio = v.fecha(body.fecha_inicio, 'La fecha inicial', { requerido: periodo });
  const fin = v.fecha(body.fecha_fin, 'La fecha final', { requerido: periodo });
  if (inicio && fin && fin < inicio) throw v.bad('La fecha final no puede ser anterior a la inicial');

  const datos = await BUILDERS[tipo]({ fecha_inicio: inicio, fecha_fin: fin });
  const { rows } = await query(
    `INSERT INTO reporte (tipo_reporte, fecha_inicio, fecha_fin, id_usuario) VALUES ($1,$2,$3,$4) RETURNING id_reporte`,
    [tipo, inicio, fin, actor.id_usuario]
  );
  const reporte = await obtenerRegistro(rows[0].id_reporte);
  return { reporte, ...datos };
}

async function obtenerRegistro(id) {
  const { rows } = await query(`${SELECT} WHERE r.id_reporte = $1`, [id]);
  if (!rows[0]) throw new AppError(404, 'El reporte no existe', 'NOT_FOUND');
  return rows[0];
}

async function listar() {
  const { rows } = await query(`${SELECT} ORDER BY r.id_reporte DESC LIMIT 100`);
  return rows;
}

// Vuelve a calcular el reporte con sus parámetros (los adeudos/habitantes reflejan el estado actual)
async function obtener(id) {
  return armar(await obtenerRegistro(id));
}

async function exportarCSV(id) {
  const { reporte, columnas, filas } = await obtener(id);
  return {
    nombre: `reporte_${reporte.tipo_reporte}_${reporte.fecha_generacion}_${reporte.id_reporte}.csv`,
    contenido: aCSV(columnas, filas),
  };
}

module.exports = { TIPOS, generar, listar, obtener, exportarCSV };
