const asyncHandler = require('../../utils/asyncHandler');
const { entero } = require('../../utils/validators');
const service = require('./reportes.service');

const id = (req) => entero(req.params.id, 'El id de reporte');

exports.generar = asyncHandler(async (req, res) => res.status(201).json(await service.generar(req.body, req.user)));
exports.listar = asyncHandler(async (req, res) => res.json(await service.listar()));
exports.obtener = asyncHandler(async (req, res) => res.json(await service.obtener(id(req))));
exports.exportarCSV = asyncHandler(async (req, res) => {
  const { nombre, contenido } = await service.exportarCSV(id(req));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
  res.send(contenido);
});
