const service = require('./configuracion.service');

exports.obtener = (req, res) => res.json(service.obtener());
exports.actualizar = (req, res) => res.json(service.actualizar(req.body));
