// Página principal: accesos a los módulos permitidos para el rol
import { h } from '../core/dom.js';
import { session } from '../core/session.js';
import { RUTAS } from '../routes.js';

export async function render(contenedor) {
  const modulos = RUTAS.filter((r) => r.descripcion && (!r.permiso || session.can(r.permiso)));
  contenedor.replaceChildren(
    h('h1', {}, `Bienvenido, ${session.user.nombre_usuario}`),
    h('p', { class: 'muted' }, `Página principal · ${session.user.rol}`),
    h('div', { class: 'cards' }, modulos.map((m) =>
      h('a', { href: `#${m.path}`, class: 'card-link' }, h('h2', {}, m.titulo), h('p', {}, m.descripcion)))));
}
