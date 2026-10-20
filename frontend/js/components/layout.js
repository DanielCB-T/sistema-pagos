// Estructura común: barra lateral (según permisos), barra superior con ruta, reloj y salida
import { h } from '../core/dom.js';
import { session } from '../core/session.js';
import { fechaHoraLarga } from '../core/format.js';

let reloj = null;

export function montarLayout(root, { rutas, actual, alSalir }) {
  if (reloj) clearInterval(reloj);
  const visibles = rutas.filter((r) => r.nav && (!r.permiso || session.can(r.permiso)));

  const enlaces = visibles.map((r) =>
    h('a', { href: `#${r.path}`, class: `nav-link${r.path === actual.path ? ' activo' : ''}`, 'aria-current': r.path === actual.path ? 'page' : undefined }, r.titulo));

  const app = h('div', { class: 'app' });
  const sidebar = h('aside', { class: 'sidebar' },
    h('a', { href: '#/inicio', class: 'brand' },
      h('img', { src: '/img/logo.svg', alt: '', width: 36, height: 36 }),
      h('span', {}, 'Gestión de Pagos')),
    h('nav', { class: 'nav', 'aria-label': 'Menú principal' }, enlaces),
    h('button', { type: 'button', class: 'btn btn-danger salir', onclick: alSalir }, 'Salir del sistema'));

  const fecha = h('span', { class: 'fecha' }, fechaHoraLarga());
  reloj = setInterval(() => { fecha.textContent = fechaHoraLarga(); }, 30000);

  const ruta = actual.path === '/inicio'
    ? h('span', {}, 'Menú principal')
    : h('span', {}, h('a', { href: '#/inicio' }, 'Menú principal'), ' › ', h('strong', {}, actual.titulo));

  const contenido = h('main', { class: 'contenido', id: 'contenido' });
  const topbar = h('header', { class: 'topbar' },
    h('button', { type: 'button', class: 'menu-btn', 'aria-label': 'Abrir menú', 'aria-expanded': 'false', onclick: () => alternarMenu() }, '☰'),
    h('div', { class: 'ruta' },
      h('div', { class: 'comunidad' }, session.config ? session.config.nombre_comunidad : ''),
      h('div', { class: 'breadcrumb' }, ruta)),
    h('div', { class: 'usuario' },
      h('span', { class: 'chip' }, `${session.user.nombre_usuario} · ${session.user.rol}`), fecha));

  const fondo = h('div', { class: 'nav-fondo', onclick: () => alternarMenu(false) });
  app.append(sidebar, fondo, h('div', { class: 'principal' }, topbar, contenido));

  // Menú lateral en móvil: se abre con ☰ y se cierra al tocar el fondo, elegir una opción o pulsar Esc
  function alternarMenu(abrir) {
    const abierto = abrir === undefined ? !app.classList.contains('nav-abierto') : abrir;
    app.classList.toggle('nav-abierto', abierto);
    topbar.querySelector('.menu-btn').setAttribute('aria-expanded', String(abierto));
  }
  sidebar.addEventListener('click', (e) => { if (e.target.closest('a')) alternarMenu(false); });
  document.addEventListener('keydown', function cerrarConEsc(e) {
    if (!app.isConnected) return document.removeEventListener('keydown', cerrarConEsc);
    if (e.key === 'Escape') alternarMenu(false);
  });

  root.replaceChildren(app);
  return contenido;
}