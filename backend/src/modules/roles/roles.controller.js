const asyncHandler = require('../../utils/asyncHandler');
const service = require('./roles.service');

exports.listar = asyncHandler(async (req, res) => res.json(await service.listar()));
exports.modificar = asyncHandler(async (req, res) => res.json(await service.modificar(req.params.id, req.body)));
exports.asignar = asyncHandler(async (req, res) => res.json(await service.asignar(req.body, req.user)));
