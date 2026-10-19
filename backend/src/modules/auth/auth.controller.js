const asyncHandler = require('../../utils/asyncHandler');
const service = require('./auth.service');
const { COOKIE, opcionesCookie } = require('../../middlewares/auth');

exports.login = asyncHandler(async (req, res) => {
  const { usuario, token } = await service.iniciarSesion(req.body.nombre_usuario, req.body.contrasena);
  res.cookie(COOKIE, token, opcionesCookie());
  res.json({ usuario });
});

exports.logout = (req, res) => {
  res.clearCookie(COOKIE, { ...opcionesCookie(), maxAge: undefined });
  res.status(204).end();
};

exports.me = (req, res) => res.json({ usuario: req.user });
