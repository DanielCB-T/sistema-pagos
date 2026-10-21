import { h } from '../core/dom.js';

// Ventana modal. Se cierra con Esc, con el botón X, o con close(). Devuelve { close }.
export function abrirModal({ titulo, contenido, ancho = false, alCerrar }) {
  const previo = document.activeElement;

  const btnCerrar = h('button', {
    type: 'button',
    class: 'modal-close',
    'aria-label': 'Cerrar ventana modal',
    title: 'Cerrar',
    onclick: () => close(),
  }, '✕');

  const modalEl = h('div', {
    class: `modal${ancho ? ' modal-reporte' : ''}`,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': titulo,
    style: 'position:relative',
  },
    btnCerrar,
    h('h2', { style: 'margin-top:0;padding-right:2rem' }, titulo),
    contenido);

  const overlay = h('div', { class: 'modal-overlay' }, modalEl);

  // Cerrar al hacer clic fuera del modal
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

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
    const fin = (valor) => { resolve(valor); modal.close(); };
    const contenido = h('div', {},
      h('p', {}, mensaje),
      h('div', { class: 'form-actions' },
        h('button', { type: 'button', class: `btn ${peligro ? 'btn-danger' : 'btn-ok'}`, onclick: () => fin(true) }, textoOk),
        h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => fin(false) }, textoCancelar)));
    modal = abrirModal({ titulo, contenido, alCerrar: () => resolve(false) });
  });
}
