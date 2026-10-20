// Cierre de sesión por inactividad.
// - Cuenta la actividad del usuario (ratón, teclado, toque, scroll), compartida entre pestañas.
// - 60 s antes de expirar muestra un aviso con cuenta regresiva y el botón "Continuar sesión".
// - Mientras hay actividad, avisa al servidor cada cierto tiempo (ping) para mantener viva la sesión.
import { h } from './dom.js';
import { api } from './api.js';
import { abrirModal } from '../components/modal.js';

const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
const CLAVE = 'sgp_ultima_actividad';
const AVISO_SEG = 60;

let activo = false;
let ultima = Date.now();
let ultimoPing = Date.now();
let temporizador = null;
let aviso = null; // { modal, texto }
let cfg = null;

const leer = () => {
  try { return Number(localStorage.getItem(CLAVE)) || ultima; } catch { return ultima; }
};
const marcar = () => {
  ultima = Date.now();
  try { localStorage.setItem(CLAVE, String(ultima)); } catch { /* almacenamiento no disponible */ }
};

function alActividad() {
  if (aviso) return; // con el aviso visible solo cuenta el botón "Continuar"
  marcar();
}

async function ping() {
  ultimoPing = Date.now();
  try { await api.get('/auth/me'); } catch { /* si la sesión expiró, api.js se encarga */ }
}

function cerrarAviso() {
  if (!aviso) return;
  const { modal } = aviso;
  aviso = null;
  modal.close();
}

function continuar() {
  cerrarAviso();
  marcar();
  ping();
}

function mostrarAviso(restante) {
  if (aviso) {
    aviso.texto.textContent = `Su sesión se cerrará en ${restante} segundo(s) por inactividad.`;
    return;
  }
  const texto = h('p', {}, `Su sesión se cerrará en ${restante} segundo(s) por inactividad.`);
  const contenido = h('div', {}, texto,
    h('div', { class: 'form-actions' },
      h('button', { type: 'button', class: 'btn btn-ok', onclick: continuar }, 'Continuar sesión')));
  const modal = abrirModal({ titulo: '¿Sigue ahí?', contenido, alCerrar: () => { if (aviso) continuar(); } });
  aviso = { modal, texto };
}

function revisar() {
  const limite = cfg.minutos * 60;
  const ult = Math.max(ultima, leer());
  const inactivo = Math.floor((Date.now() - ult) / 1000);
  const restante = limite - inactivo;

  if (restante <= 0) {
    const alExpirar = cfg.alExpirar;
    detener();
    alExpirar();
    return;
  }
  if (restante <= AVISO_SEG) {
    mostrarAviso(restante);
    return;
  }
  if (aviso) cerrarAviso(); // otra pestaña tuvo actividad
  // latido: si hubo actividad desde el último ping, renovar la sesión del servidor
  const cadaMs = Math.min(5, Math.max(1, cfg.minutos / 3)) * 60 * 1000;
  if (Date.now() - ultimoPing >= cadaMs && ult > ultimoPing) ping();
}

/** Inicia el control (idempotente). `alExpirar` se llama cuando se agota el tiempo. */
export function iniciarInactividad({ minutos, alExpirar }) {
  if (activo) return;
  activo = true;
  cfg = { minutos: Math.max(1, Number(minutos) || 15), alExpirar };
  marcar();
  ultimoPing = Date.now();
  for (const e of EVENTOS) window.addEventListener(e, alActividad, { passive: true });
  temporizador = setInterval(revisar, 1000);
}

export function detenerInactividad() { detener(); }

function detener() {
  if (!activo) return;
  activo = false;
  clearInterval(temporizador);
  for (const e of EVENTOS) window.removeEventListener(e, alActividad);
  cerrarAviso();
  try { localStorage.removeItem(CLAVE); } catch { /* ignorar */ }
}