const asyncHandler = require('../../utils/asyncHandler');
const service = require('./auth.service');
const { COOKIE, opcionesCookie, infoSesion } = require('../../middlewares/auth');

exports.login = asyncHandler(async (req, res) => {
  const { usuario, token } = await service.iniciarSesion(req.body.nombre_usuario, req.body.contrasena, req.ip);
  res.cookie(COOKIE, token, opcionesCookie());
  res.json({ usuario, sesion: infoSesion() });
});

exports.logout = (req, res) => {
  res.clearCookie(COOKIE, { ...opcionesCookie(), maxAge: undefined });
  res.status(204).end();
};

// También sirve como "latido": al ser una ruta autenticada, renueva la sesión deslizante
exports.me = (req, res) => res.json({ usuario: req.user, sesion: infoSesion() });