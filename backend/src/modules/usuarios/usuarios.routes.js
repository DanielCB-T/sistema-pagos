const router = require('express').Router();
const ctrl = require('./usuarios.controller');
const { requierePermiso: req } = require('../../middlewares/rbac');

router.get('/', req('usuarios:leer'), ctrl.listar);
router.post('/', req('usuarios:crear'), ctrl.crear);
router.get('/:id', req('usuarios:leer'), ctrl.obtener);
router.put('/:id', req('usuarios:editar'), ctrl.actualizar);
router.patch('/:id/estado', req('usuarios:bloquear'), ctrl.cambiarEstado);
router.delete('/:id', req('usuarios:eliminar'), ctrl.eliminar);

module.exports = router;
