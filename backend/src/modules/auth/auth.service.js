const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');
const AppError = require('../../utils/AppError');
const { perfil, firmarToken } = require('../../middlewares/auth');

// Hash ficticio para que el tiempo de respuesta no revele si el usuario existe
const HASH_FALSO = bcrypt.hashSync('no-existe', 10);

async function iniciarSesion(nombreUsuario, contrasena) {
  if (typeof nombreUsuario !== 'string' || typeof contrasena !== 'string' || !nombreUsuario || !contrasena) {
    throw new AppError(400, 'Ingrese usuario y contraseña', 'VALIDACION');
  }
  const { rows } = await query(
    `SELECT u.id_usuario, u.nombre_usuario, u.contrasena, u.estado, u.id_rol, r.nombre_rol
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol WHERE u.nombre_usuario = $1`,
    [nombreUsuario.trim()]
  );
  const u = rows[0];
  const coincide = await bcrypt.compare(contrasena, u ? u.contrasena : HASH_FALSO);
  if (!u || !coincide) throw new AppError(401, 'Usuario o contraseña incorrectos', 'CREDENCIALES');
  if (u.estado !== 'activo') throw new AppError(403, 'El usuario está bloqueado. Contacte al administrador', 'BLOQUEADO');
  return { usuario: perfil(u), token: firmarToken(u.id_usuario) };
}

module.exports = { iniciarSesion };
