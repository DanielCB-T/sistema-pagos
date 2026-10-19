const router = require('express').Router();
const ctrl = require('./habitantes.controller');
const { requierePermiso: req } = require('../../middlewares/rbac');

router.get('/', req('habitantes:leer'), ctrl.listar);
router.post('/', req('habitantes:crear'), ctrl.crear);
router.get('/:id', req('habitantes:leer'), ctrl.obtener);
router.put('/:id', req('habitantes:editar'), ctrl.actualizar);
router.delete('/:id', req('habitantes:eliminar'), ctrl.eliminar);

module.exports = router;
