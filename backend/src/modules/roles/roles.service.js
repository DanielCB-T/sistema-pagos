const { query } = require('../../config/db');
const AppError = require('../../utils/AppError');
const v = require('../../utils/validators');
const usuarios = require('../usuarios/usuarios.service');

async function listar() {
  const { rows } = await query(
    `SELECT r.id_rol, r.nombre_rol, COUNT(u.id_usuario)::int AS total_usuarios
       FROM rol r LEFT JOIN usuario u ON u.id_rol = r.id_rol
      GROUP BY r.id_rol ORDER BY r.id_rol`
  );
  return rows;
}

// Modificar rol: cambia solo el nombre visible. Los permisos se definen en config/permissions.js
async function modificar(id, body) {
  const idRol = v.entero(id, 'El id de rol');
  const nombre = v.texto(body.nombre_rol, 'El nombre del rol', { requerido: true, min: 3, max: 50 });
  const { rowCount } = await query('UPDATE rol SET nombre_rol = $2 WHERE id_rol = $1', [idRol, nombre]);
  if (!rowCount) throw new AppError(404, 'El rol no existe', 'NOT_FOUND');
  return (await listar()).find((r) => r.id_rol === idRol);
}

// Asignar rol a un usuario
async function asignar(body, actor) {
  const idUsuario = v.entero(body.id_usuario, 'El usuario');
  return usuarios.cambiarRol(idUsuario, body.id_rol, actor);
}

module.exports = { listar, modificar, asignar };
