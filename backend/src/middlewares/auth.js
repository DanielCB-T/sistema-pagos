// Autenticación: valida el JWT de la cookie y carga el usuario vigente desde la BD.
// Sesión deslizante: cada petición válida renueva la cookie por IDLE_MINUTES (cierre por inactividad),
// sin superar SESSION_HOURS desde el inicio de sesión (duración máxima absoluta).
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { permisosDeRol } = require('../config/permissions');

// Con HTTPS se usa el prefijo __Host-, que impide que otro subdominio sobrescriba la cookie
const COOKIE = config.cookieSecure ? '__Host-sgp_token' : 'sgp_token';
const ALGORITMO = 'HS256';
const ahora = () => Math.floor(Date.now() / 1000);

const perfil = (u) => ({
  id_usuario: u.id_usuario,
  nombre_usuario: u.nombre_usuario,
  id_rol: u.id_rol,
  rol: u.nombre_rol,
  permisos: permisosDeRol(u.id_rol),
});

// `inicio`: momento (segundos) en que el usuario escribió su contraseña
const firmarToken = (idUsuario, inicio = ahora()) =>
  jwt.sign({ sub: idUsuario, at: inicio }, config.jwt.secret, {
    algorithm: ALGORITMO,
    expiresIn: `${config.jwt.idleMinutes}m`,
  });

const opcionesCookie = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: config.cookieSecure,
  path: '/',
  maxAge: config.jwt.idleMinutes * 60 * 1000,
});

// Parámetros de sesión que el frontend necesita para su temporizador de inactividad
const infoSesion = () => ({ inactividad_minutos: config.jwt.idleMinutes });

const autenticar = asyncHandler(async (req, res, next) => {
  const token = req.cookies && req.cookies[COOKIE];
  if (!token) throw new AppError(401, 'Sesión no iniciada', 'NO_AUTH');
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret, { algorithms: [ALGORITMO] });
  } catch {
    throw new AppError(401, 'Sesión expirada o inválida', 'NO_AUTH');
  }
  const inicio = payload.at || payload.iat;
  if (ahora() - inicio > config.jwt.sessionHours * 3600) {
    throw new AppError(401, 'La sesión alcanzó su duración máxima. Inicie sesión de nuevo', 'NO_AUTH');
  }
  const { rows } = await query(
    `SELECT u.id_usuario, u.nombre_usuario, u.estado, u.id_rol, r.nombre_rol
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol WHERE u.id_usuario = $1`,
    [payload.sub]
  );
  const u = rows[0];
  if (!u || u.estado !== 'activo') throw new AppError(401, 'Usuario no disponible', 'NO_AUTH');
  req.user = perfil(u);
  res.cookie(COOKIE, firmarToken(u.id_usuario, inicio), opcionesCookie()); // renueva (sesión deslizante)
  next();
});

module.exports = { autenticar, perfil, firmarToken, opcionesCookie, infoSesion, COOKIE };