const asyncHandler = require('../../utils/asyncHandler');
const { entero } = require('../../utils/validators');
const service = require('./pagos.service');
const configuracion = require('../configuracion/configuracion.service');
const { generarComprobante } = require('./comprobante.pdf');

const id = (req) => entero(req.params.id, 'El id de pago');

exports.listar = asyncHandler(async (req, res) => res.json(await service.listar(req.query)));
exports.obtener = asyncHandler(async (req, res) => res.json(await service.obtener(id(req))));
exports.crear = asyncHandler(async (req, res) => res.status(201).json(await service.crear(req.body, req.user)));
exports.actualizar = asyncHandler(async (req, res) => res.json(await service.actualizar(id(req), req.body)));
exports.eliminar = asyncHandler(async (req, res) => {
  await service.eliminar(id(req));
  res.status(204).end();
});

exports.comprobante = asyncHandler(async (req, res) => {
  const pago = await service.obtenerParaComprobante(id(req));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="comprobante-${String(pago.id_pago).padStart(6, '0')}.pdf"`);
  generarComprobante(pago, configuracion.obtener(), res);
});
