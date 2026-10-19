// Matriz de permisos por rol (derivada de los diagramas de casos de uso).
// ÚNICO lugar donde se define qué puede hacer cada rol. El frontend recibe
// esta lista en /api/auth/me y la usa para mostrar u ocultar opciones.
//
// Los ids de rol corresponden a los que crea "npm run seed".
const ROLES = { ADMINISTRADOR: 1, TESORERO: 2, SECRETARIO: 3 };

const PERMISOS_POR_ROL = {
  [ROLES.ADMINISTRADOR]: [
    'usuarios:leer', 'usuarios:crear', 'usuarios:editar', 'usuarios:eliminar', 'usuarios:bloquear',
    'roles:leer', 'roles:asignar', 'roles:modificar',
    'sistema:configurar',
    'pagos:leer',          // Consultar pago (buscar / filtrar)
    'adeudos:leer', 'habitantes:leer',
    'reportes:generar', 'reportes:exportar',
  ],
  [ROLES.TESORERO]: [
    'pagos:leer', 'pagos:crear', 'pagos:editar', 'pagos:eliminar', 'pagos:comprobante',
    'adeudos:leer', 'adeudos:crear', 'adeudos:editar', 'adeudos:eliminar',
    'habitantes:leer',     // necesario para elegir al habitante en el pago
    'reportes:generar', 'reportes:exportar',
  ],
  [ROLES.SECRETARIO]: [
    'habitantes:leer', 'habitantes:crear', 'habitantes:editar', 'habitantes:eliminar',
    'pagos:leer', 'adeudos:leer',
    'reportes:generar', 'reportes:exportar',
  ],
};

const permisosDeRol = (idRol) => PERMISOS_POR_ROL[idRol] || [];

module.exports = { ROLES, permisosDeRol };
