const router = require('express').Router();
const ctrl = require('./roles.controller');
const { requierePermiso: req } = require('../../middlewares/rbac');

router.get('/', req('roles:leer'), ctrl.listar);
router.put('/asignar', req('roles:asignar'), ctrl.asignar); // debe ir antes de '/:id'
router.put('/:id', req('roles:modificar'), ctrl.modificar);

module.exports = router;
