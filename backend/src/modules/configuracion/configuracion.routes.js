const router = require('express').Router();
const ctrl = require('./configuracion.controller');
const { requierePermiso: req } = require('../../middlewares/rbac');

router.get('/', ctrl.obtener); // cualquier usuario autenticado (encabezado y comprobantes)
router.put('/', req('sistema:configurar'), ctrl.actualizar);

module.exports = router;
