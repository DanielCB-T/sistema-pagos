// Autenticación: valida el JWT de la cookie y carga el usuario vigente desde la BD
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { permisosDeRol } = require('../config/permissions');

const COOKIE = 'sgp_token';

const perfil = (u) => ({
  id_usuario: u.id_usuario,
  nombre_usuario: u.nombre_usuario,
  id_rol: u.id_rol,
  rol: u.nombre_rol,
  permisos: permisosDeRol(u.id_rol),
});

const firmarToken = (idUsuario) =>
  jwt.sign({ sub: idUsuario }, config.jwt.secret, { expiresIn: `${config.jwt.sessionHours}h` });

const opcionesCookie = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: config.cookieSecure,
  maxAge: config.jwt.sessionHours * 3600 * 1000,
});

const autenticar = asyncHandler(async (req, res, next) => {
  const token = req.cookies && req.cookies[COOKIE];
  if (!token) throw new AppError(401, 'Sesión no iniciada', 'NO_AUTH');
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    throw new AppError(401, 'Sesión expirada o inválida', 'NO_AUTH');
  }
  const { rows } = await query(
    `SELECT u.id_usuario, u.nombre_usuario, u.estado, u.id_rol, r.nombre_rol
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol WHERE u.id_usuario = $1`,
    [payload.sub]
  );
  const u = rows[0];
  if (!u || u.estado !== 'activo') throw new AppError(401, 'Usuario no disponible', 'NO_AUTH');
  req.user = perfil(u);
  next();
});

module.exports = { autenticar, perfil, firmarToken, opcionesCookie, COOKIE };
