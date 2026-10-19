// Punto de entrada: sesión + enrutado por hash (#/pagos, #/usuarios, ...)
import { h } from './core/dom.js';
import { session } from './core/session.js';
import { definirAlExpirarSesion } from './core/api.js';
import { RUTAS } from './routes.js';
import { montarLayout } from './components/layout.js';
import { render as vistaLogin } from './views/login.js';
import { toast } from './components/toast.js';

const raiz = document.getElementById('app');
const irA = (ruta) => { location.hash = `#${ruta}`; };

async function salir() {
  await session.cerrar();
  irA('/login');
}

async function enrutar() {
  const path = location.hash.replace(/^#/, '') || '/inicio';

  if (!session.user) {
    if (path !== '/login') return irA('/login');
    return vistaLogin(raiz, { alIngresar: () => irA('/inicio') });
  }
  if (path === '/login') return irA('/inicio');

  const ruta = RUTAS.find((r) => r.path === path);
  if (!ruta) return irA('/inicio');
  if (ruta.permiso && !session.can(ruta.permiso)) {
    toast('No tiene permiso para acceder a esa sección', 'error');
    return irA('/inicio');
  }

  const contenido = montarLayout(raiz, { rutas: RUTAS, actual: ruta, alSalir: salir });
  try {
    await ruta.view(contenido);
  } catch (err) {
    contenido.replaceChildren(h('div', { class: 'form-error' }, `No se pudo cargar la pantalla: ${err.message}`));
  }
}

definirAlExpirarSesion(() => {
  if (!session.user) return;
  session.limpiar();
  toast('Su sesión expiró. Inicie sesión de nuevo', 'error');
  irA('/login');
});

window.addEventListener('hashchange', enrutar);
await session.cargar();
enrutar();
