// Página principal: accesos a los módulos permitidos para el rol
import { h } from '../core/dom.js';
import { session } from '../core/session.js';
import { RUTAS } from '../routes.js';

// Iconos por módulo: imágenes SVG de la carpeta /img (excepto configuración que mantiene su emoji)
const ICONOS = {
  '/pagos':         '/img/pagos.svg',
  '/adeudos':       '/img/adeudos.svg',
  '/reportes':      '/img/reporte.svg',
  '/habitantes':    '/img/habitante.svg',
  '/usuarios':      '/img/persona.svg',
  '/roles':         '/img/roles.svg',
  '/configuracion': '⚙️',
};

function renderCardIcon(path) {
  const icon = ICONOS[path];
  if (!icon) return h('div', { class: 'card-icon' });
  if (icon.startsWith('/img/')) {
    return h('div', { class: 'card-icon' }, h('img', { src: icon, class: 'card-img', alt: '' }));
  }
  return h('div', { class: 'card-icon' }, icon);
}

export async function render(contenedor) {
  const modulos = RUTAS.filter((r) => r.descripcion && !r.esConfig && (!r.permiso || session.can(r.permiso)));
  const nombre = session.user.nombre_usuario;
  const rol    = session.user.rol;

  contenedor.replaceChildren(
    // Hero de bienvenida con logo redondo
    h('div', { class: 'home-hero' },
      h('img', { src: '/img/logo.svg', alt: 'Logo de la asamblea', class: 'home-hero-logo' }),
      h('div', { class: 'home-hero-text' },
        h('h1', {}, `Bienvenido, ${nombre}`),
        h('p', {}, `Sesión iniciada como ${rol} · Asamblea Comunitaria de San Juan Teponaxtla`))),
    // Tarjetas de acceso a módulos
    h('div', { class: 'cards' },
      modulos.map((m) =>
        h('a', { href: `#${m.path}`, class: 'card-link' },
          renderCardIcon(m.path),
          h('h2', {}, m.titulo),
          h('p',  {}, m.descripcion)))));
}
