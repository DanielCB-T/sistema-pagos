// Tabla de rutas: cada vista declara el permiso que necesita (los mismos que define el backend).
// Para agregar una pantalla: crear views/<nombre>.js con "export async function render(contenedor)" y registrarla aquí.
import * as home from './views/home.js';
import * as pagos from './views/pagos.js';
import * as adeudos from './views/adeudos.js';
import * as habitantes from './views/habitantes.js';
import * as reportes from './views/reportes.js';
import * as usuarios from './views/usuarios.js';
import * as roles from './views/roles.js';
import * as configuracion from './views/configuracion.js';

export const RUTAS = [
  { path: '/inicio', titulo: 'Inicio', nav: true, view: home.render },
  { path: '/pagos', titulo: 'Gestión de Pagos', permiso: 'pagos:leer', nav: true, view: pagos.render,
    descripcion: 'Registrar, consultar, buscar y generar comprobantes de pago.' },
  { path: '/adeudos', titulo: 'Gestión de Adeudos', permiso: 'adeudos:leer', nav: true, view: adeudos.render,
    descripcion: 'Consultar y administrar los adeudos de los habitantes.' },
  { path: '/reportes', titulo: 'Reportes', permiso: 'reportes:generar', nav: true, view: reportes.render,
    descripcion: 'Generar, imprimir y exportar reportes.' },
  { path: '/habitantes', titulo: 'Gestión de Habitantes', permiso: 'habitantes:leer', nav: true, view: habitantes.render,
    descripcion: 'Registrar y actualizar los datos de los habitantes.' },
  { path: '/usuarios', titulo: 'Gestión de Usuarios', permiso: 'usuarios:leer', nav: true, view: usuarios.render,
    descripcion: 'Registrar, editar, bloquear y eliminar usuarios del sistema.' },
  { path: '/roles', titulo: 'Gestión de Roles', permiso: 'roles:leer', nav: true, view: roles.render,
    descripcion: 'Asignar y modificar los roles de los usuarios.' },
  { path: '/configuracion', titulo: 'Configurar Sistema', permiso: 'sistema:configurar', nav: true, esConfig: true, view: configuracion.render,
    descripcion: 'Datos de la comunidad que aparecen en el sistema y en los comprobantes.' },
];
