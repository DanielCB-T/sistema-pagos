import { h } from '../core/dom.js';

export function toast(mensaje, tipo = 'ok') {
  const cont = document.getElementById('toasts');
  if (!cont) return;
  const el = h('div', { class: `toast toast-${tipo}`, role: tipo === 'error' ? 'alert' : 'status' }, mensaje);
  cont.append(el);
  setTimeout(() => el.remove(), tipo === 'error' ? 6000 : 3500);
}
