const router = require('express').Router();
const ctrl = require('./adeudos.controller');
const { requierePermiso: req } = require('../../middlewares/rbac');

router.get('/', req('adeudos:leer'), ctrl.listar);
router.post('/', req('adeudos:crear'), ctrl.crear);
router.get('/:id', req('adeudos:leer'), ctrl.obtener);
router.put('/:id', req('adeudos:editar'), ctrl.actualizar);
router.delete('/:id', req('adeudos:eliminar'), ctrl.eliminar);

module.exports = router;
