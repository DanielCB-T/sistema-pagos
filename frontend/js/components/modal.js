import { h } from '../core/dom.js';

// Ventana modal. Se cierra con Esc o con close(). Devuelve { close }.
export function abrirModal({ titulo, contenido, ancho = false, alCerrar }) {
  const previo = document.activeElement;
  const overlay = h('div', { class: 'modal-overlay' },
    h('div', { class: `modal${ancho ? ' modal-wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
      h('h2', {}, titulo), contenido));

  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    if (previo && previo.focus) previo.focus();
    if (alCerrar) alCerrar();
  }
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  const primero = overlay.querySelector('input, select, textarea, button');
  if (primero) primero.focus();
  return { close };
}

// Diálogo de confirmación -> Promise<boolean>
export function confirmar({ titulo, mensaje, textoOk = 'Aceptar', textoCancelar = 'Cancelar', peligro = false }) {
  return new Promise((resolve) => {
    let modal;
    // Se resuelve ANTES de cerrar: close() dispara alCerrar, que resuelve(false) si el usuario cierra con Esc
    const fin = (valor) => { resolve(valor); modal.close(); };
    const contenido = h('div', {},
      h('p', {}, mensaje),
      h('div', { class: 'form-actions' },
        h('button', { type: 'button', class: `btn ${peligro ? 'btn-danger' : 'btn-ok'}`, onclick: () => fin(true) }, textoOk),
        h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => fin(false) }, textoCancelar)));
    modal = abrirModal({ titulo, contenido, alCerrar: () => resolve(false) });
  });
}
