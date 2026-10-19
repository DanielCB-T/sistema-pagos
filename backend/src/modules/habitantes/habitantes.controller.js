const asyncHandler = require('../../utils/asyncHandler');
const { entero } = require('../../utils/validators');
const service = require('./habitantes.service');

const id = (req) => entero(req.params.id, 'El id de habitante');

exports.listar = asyncHandler(async (req, res) => res.json(await service.listar(req.query)));
exports.obtener = asyncHandler(async (req, res) => res.json(await service.obtener(id(req))));
exports.crear = asyncHandler(async (req, res) => res.status(201).json(await service.crear(req.body)));
exports.actualizar = asyncHandler(async (req, res) => res.json(await service.actualizar(id(req), req.body)));
exports.eliminar = asyncHandler(async (req, res) => {
  await service.eliminar(id(req));
  res.status(204).end();
});
