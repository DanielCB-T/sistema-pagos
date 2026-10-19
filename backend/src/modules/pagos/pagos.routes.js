const router = require('express').Router();
const ctrl = require('./pagos.controller');
const { requierePermiso: req } = require('../../middlewares/rbac');

router.get('/', req('pagos:leer'), ctrl.listar);
router.post('/', req('pagos:crear'), ctrl.crear);
router.get('/:id', req('pagos:leer'), ctrl.obtener);
router.get('/:id/comprobante', req('pagos:comprobante'), ctrl.comprobante);
router.put('/:id', req('pagos:editar'), ctrl.actualizar);
router.delete('/:id', req('pagos:eliminar'), ctrl.eliminar);

module.exports = router;
