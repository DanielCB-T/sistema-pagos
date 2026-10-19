const router = require('express').Router();
const ctrl = require('./reportes.controller');
const { requierePermiso: req } = require('../../middlewares/rbac');

router.get('/', req('reportes:generar'), ctrl.listar);
router.post('/', req('reportes:generar'), ctrl.generar);
router.get('/:id', req('reportes:generar'), ctrl.obtener);
router.get('/:id/csv', req('reportes:exportar'), ctrl.exportarCSV);

module.exports = router;
