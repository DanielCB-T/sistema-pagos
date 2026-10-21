// Estructura común: barra lateral (según permisos), barra superior con logo, ruta y salida
import { h } from '../core/dom.js';
import { session } from '../core/session.js';
import { fechaHoraLarga } from '../core/format.js';

let reloj = null;

// Iconos por ruta: se usan las imágenes correspondientes en /img (el emoji de configuración se deja tal cual)
const ICONOS = {
  '/inicio':        '/img/inicio.svg',
  '/pagos':         '/img/pagos.svg',
  '/adeudos':       '/img/adeudos.svg',
  '/reportes':      '/img/reporte.svg',
  '/habitantes':    '/img/habitante.svg',
  '/usuarios':      '/img/persona.svg',
  '/roles':         '/img/roles.svg',
  '/configuracion': '⚙️',
};

function renderIcono(path) {
  const icon = ICONOS[path];
  if (!icon) return h('span', { class: 'nav-icon' }, '•');
  if (icon.startsWith('/img/')) {
    return h('img', { src: icon, class: 'nav-img', alt: '' });
  }
  return h('span', { class: 'nav-icon' }, icon);
}

export function montarLayout(root, { rutas, actual, alSalir }) {
  if (reloj) clearInterval(reloj);
  const visibles = rutas.filter((r) => r.nav && (!r.permiso || session.can(r.permiso)));
  // Separar configuración del resto
  const navPrincipal = visibles.filter((r) => !r.esConfig);
  const rutaConfig   = visibles.find((r) => r.esConfig);

  const enlaces = navPrincipal.map((r) =>
    h('a', {
      href: `#${r.path}`,
      class: `nav-link${r.path === actual.path ? ' activo' : ''}`,
      'aria-current': r.path === actual.path ? 'page' : undefined,
    },
    renderIcono(r.path),
    r.titulo));

  const app = h('div', { class: 'app' });

  // Footer del sidebar: configuración (engrane) + salir
  const footerItems = [];
  if (rutaConfig) {
    footerItems.push(
      h('a', {
        href: '#/configuracion',
        class: `btn-config${actual.path === '/configuracion' ? ' activo' : ''}`,
        title: 'Configurar sistema',
      },
      h('span', { class: 'config-icon' }, '⚙️'),
      'Configuración'));
  }
  footerItems.push(
    h('button', { type: 'button', class: 'btn-salir', onclick: alSalir },
      'Cerrar sesión'));

  const sidebar = h('aside', { class: 'sidebar' },
    h('a', { href: '#/inicio', class: 'sidebar-header' },
      h('img', { src: '/img/logo.svg', alt: 'Logo de la asamblea' }),
      h('div', {},
        h('div', { class: 'sidebar-title' }, session.config ? session.config.nombre_comunidad : 'Gestión de Pagos'),
        h('div', { class: 'sidebar-sub' }, 'San Juan Teponaxtla'))),
    h('nav', { class: 'nav', 'aria-label': 'Menú principal' },
      h('div', { class: 'nav-label' }, 'Módulos'),
      ...enlaces),
    h('div', { class: 'sidebar-footer' }, ...footerItems));

  const fecha = h('span', { class: 'fecha' }, fechaHoraLarga());
  reloj = setInterval(() => { fecha.textContent = fechaHoraLarga(); }, 30000);

  const contenido = h('main', { class: 'contenido', id: 'contenido' });

  const topbar = h('header', { class: 'topbar' },
    h('button', { type: 'button', class: 'menu-btn', 'aria-label': 'Abrir menú', 'aria-expanded': 'false', onclick: () => alternarMenu() }, '☰'),
    // Logo redondo clickable que lleva al inicio
    h('a', { href: '#/inicio', class: 'topbar-logo', title: 'Ir al inicio' },
      h('img', { src: '/img/logo.svg', alt: 'Logo asamblea' })),
    h('div', { class: 'ruta' },
      h('div', { class: 'comunidad' }, session.config ? session.config.nombre_comunidad : ''),
      h('div', { class: 'breadcrumb' }, h('strong', {}, actual.titulo))),
    h('div', { class: 'usuario' },
      h('span', { class: 'chip' }, `${session.user.nombre_usuario} · ${session.user.rol}`), fecha));

  const fondo = h('div', { class: 'nav-fondo', onclick: () => alternarMenu(false) });
  app.append(sidebar, fondo, h('div', { class: 'principal' }, topbar, contenido));

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