const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');
const AppError = require('../../utils/AppError');
const v = require('../../utils/validators');
const { likePattern } = require('../../utils/sql');

const ESTADOS = ['activo', 'bloqueado'];
const SELECT = `SELECT u.id_usuario, u.nombre_usuario, u.estado, u.id_rol, r.nombre_rol
                  FROM usuario u JOIN rol r ON r.id_rol = u.id_rol`;

async function listar({ q } = {}) {
  const params = [];
  let where = '';
  if (q && String(q).trim()) {
    params.push(likePattern(q));
    where = 'WHERE u.nombre_usuario ILIKE $1 OR r.nombre_rol ILIKE $1';
  }
  const { rows } = await query(`${SELECT} ${where} ORDER BY u.nombre_usuario`, params);
  return rows;
}

async function obtener(id) {
  const { rows } = await query(`${SELECT} WHERE u.id_usuario = $1`, [id]);
  if (!rows[0]) throw new AppError(404, 'El usuario no existe', 'NOT_FOUND');
  return rows[0];
}

const validarNombre = (x) =>
  v.texto(x, 'El nombre de usuario', {
    requerido: true, min: 3, max: 50,
    patron: /^[\w.@-]+$/, mensajePatron: 'El nombre de usuario solo admite letras, números, punto, guion y guion bajo',
  });

async function existeRol(idRol) {
  const { rowCount } = await query('SELECT 1 FROM rol WHERE id_rol = $1', [idRol]);
  if (!rowCount) throw new AppError(400, 'El rol seleccionado no existe', 'VALIDACION');
}

async function crear(body) {
  const nombre = validarNombre(body.nombre_usuario);
  const pass = v.contrasena(body.contrasena);
  const idRol = v.entero(body.id_rol, 'El rol');
  const estado = v.opcion(body.estado || 'activo', 'El estado', ESTADOS);
  await existeRol(idRol);
  const hash = await bcrypt.hash(pass, 10);
  const { rows } = await query(
    `INSERT INTO usuario (nombre_usuario, contrasena, estado, id_rol) VALUES ($1,$2,$3,$4) RETURNING id_usuario`,
    [nombre, hash, estado, idRol]
  );
  return obtener(rows[0].id_usuario);
}

// No se permite que el administrador se bloquee o cambie su propio rol (evita quedarse sin acceso)
function protegerAutoedicion(id, actor, cambia) {
  if (id === actor.id_usuario && cambia) {
    throw new AppError(409, 'No puede realizar esta acción sobre su propio usuario', 'AUTOEDICION');
  }
}

async function actualizar(id, body, actor) {
  const actual = await obtener(id);
  const nombre = body.nombre_usuario !== undefined ? validarNombre(body.nombre_usuario) : actual.nombre_usuario;
  const pass = v.contrasena(body.contrasena, { requerido: false });
  const idRol = body.id_rol !== undefined ? v.entero(body.id_rol, 'El rol') : actual.id_rol;
  const estado = body.estado !== undefined ? v.opcion(body.estado, 'El estado', ESTADOS) : actual.estado;
  protegerAutoedicion(id, actor, idRol !== actual.id_rol || estado !== actual.estado);
  if (idRol !== actual.id_rol) await existeRol(idRol);
  const hash = pass ? await bcrypt.hash(pass, 10) : null;
  await query(
    `UPDATE usuario SET nombre_usuario=$2, id_rol=$3, estado=$4, contrasena=COALESCE($5, contrasena)
      WHERE id_usuario=$1`,
    [id, nombre, idRol, estado, hash]
  );
  return obtener(id);
}

// Bloquear / desbloquear (caso de uso "Bloquear usuario")
async function cambiarEstado(id, estado, actor) {
  const nuevo = v.opcion(estado, 'El estado', ESTADOS);
  protegerAutoedicion(id, actor, true);
  await obtener(id);
  await query('UPDATE usuario SET estado = $2 WHERE id_usuario = $1', [id, nuevo]);
  return obtener(id);
}

// Asignar / modificar el rol de un usuario (caso de uso "Gestionar roles")
async function cambiarRol(id, idRolBruto, actor) {
  const idRol = v.entero(idRolBruto, 'El rol');
  protegerAutoedicion(id, actor, true);
  await obtener(id);
  await existeRol(idRol);
  await query('UPDATE usuario SET id_rol = $2 WHERE id_usuario = $1', [id, idRol]);
  return obtener(id);
}

async function eliminar(id, actor) {
  protegerAutoedicion(id, actor, true);
  await obtener(id);
  const { rows } = await query(
    `SELECT (SELECT COUNT(*) FROM pago WHERE id_usuario = $1)::int AS pagos,
            (SELECT COUNT(*) FROM reporte WHERE id_usuario = $1)::int AS reportes`,
    [id]
  );
  if (rows[0].pagos || rows[0].reportes) {
    throw new AppError(409, 'El usuario tiene pagos o reportes registrados. Bloquéelo en lugar de eliminarlo', 'RELACIONADO');
  }
  await query('DELETE FROM usuario WHERE id_usuario = $1', [id]);
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, cambiarRol, eliminar };
