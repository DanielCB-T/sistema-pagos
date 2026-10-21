// Página principal: accesos a los módulos permitidos para el rol
import { h } from '../core/dom.js';
import { session } from '../core/session.js';
import { RUTAS } from '../routes.js';

// Iconos por módulo
const ICONOS = {
  '/pagos':      '💳',
  '/adeudos':    '📋',
  '/reportes':   '📊',
  '/habitantes': '👥',
  '/usuarios':   '👤',
  '/roles':      '🛡️',
  '/configuracion': '⚙️',
};

export async function render(contenedor) {
  const modulos = RUTAS.filter((r) => r.descripcion && !r.esConfig && (!r.permiso || session.can(r.permiso)));
  const nombre = session.user.nombre_usuario;
  const rol    = session.user.rol;

  contenedor.replaceChildren(
    // Hero de bienvenida
    h('div', { class: 'home-hero' },
      h('img', { src: '/img/logo.svg', alt: '', width: 64, height: 64, style: 'border-radius:50%;border:3px solid rgba(255,255,255,.3);padding:6px;background:rgba(255,255,255,.1);flex-shrink:0' }),
      h('div', { class: 'home-hero-text' },
        h('h1', {}, `👋 Bienvenido, ${nombre}`),
        h('p', {}, `Sesión iniciada como ${rol} · Asamblea Comunitaria de San Juan Teponaxtla`))),
    // Tarjetas
    h('div', { class: 'cards' },
      modulos.map((m) =>
        h('a', { href: `#${m.path}`, class: 'card-link' },
          h('div', { class: 'card-icon' }, ICONOS[m.path] || '📌'),
          h('h2', {}, m.titulo),
          h('p',  {}, m.descripcion)))));
}
