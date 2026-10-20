import { h } from '../core/dom.js';

const ETIQUETAS = { pendiente: 'Pendiente', parcial: 'Parcial', pagado: 'Pagado', activo: 'Activo', bloqueado: 'Bloqueado' };
export const POR_PAGINA = 10;

export const insignia = (estado) => h('span', { class: `badge badge-${estado}` }, ETIQUETAS[estado] || estado);

// Números de página a mostrar: 1 … (actual-1) actual (actual+1) … última
function numerosDePagina(actual, total) {
  const set = new Set([1, total, actual - 1, actual, actual + 1]);
  const lista = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const salida = [];
  lista.forEach((n, i) => {
    if (i > 0 && n - lista[i - 1] > 1) salida.push('…');
    salida.push(n);
  });
  return salida;
}

/**
 * Tabla de datos con paginación en el navegador (10 registros por página).
 * columns: [{ label, key, render:(fila)=>Node|string, align:'right' }]
 * acciones: (fila) => Node[]   (columna de botones; se oculta al imprimir)
 * Al imprimir se incluyen todas las filas, no solo las de la página visible.
 */
export function tablaDatos({ columns, rows, acciones, vacio = 'No hay registros para mostrar', porPagina = POR_PAGINA }) {
  if (!rows.length) return h('p', { class: 'empty' }, vacio);

  const filas = rows.map((fila) => h('tr', {},
    columns.map((c) => h('td', { class: c.align === 'right' ? 'num' : '', 'data-label': c.label }, c.render ? c.render(fila) : fila[c.key] ?? '—')),
    acciones ? h('td', { class: 'col-acciones', 'data-label': 'Acciones' }, h('div', { class: 'row-actions' }, acciones(fila))) : null));

  const tabla = h('div', { class: 'table-wrap' },
    h('table', { class: 'table' },
      h('thead', {}, h('tr', {},
        columns.map((c) => h('th', { class: c.align === 'right' ? 'num' : '' }, c.label)),
        acciones ? h('th', { class: 'col-acciones' }, 'Acciones') : null)),
      h('tbody', {}, filas)));

  const total = rows.length;
  const paginas = Math.ceil(total / porPagina);
  if (paginas <= 1) return tabla;

  const barra = h('nav', { class: 'pager no-print', 'aria-label': 'Paginación' });
  let actual = 1;

  function mostrar(n) {
    actual = Math.min(Math.max(1, n), paginas);
    const desde = (actual - 1) * porPagina;
    filas.forEach((tr, i) => { tr.hidden = i < desde || i >= desde + porPagina; });
    const hasta = Math.min(desde + porPagina, total);

    const btn = (texto, destino, extra = {}) =>
      h('button', { type: 'button', class: `btn btn-sm btn-ghost${extra.actual ? ' pag-actual' : ''}`, disabled: extra.off, 'aria-current': extra.actual ? 'page' : undefined, 'aria-label': extra['aria-label'], onclick: () => mostrar(destino) }, texto);

    barra.replaceChildren(
      h('span', { class: 'pager-info' }, `Mostrando ${desde + 1}–${hasta} de ${total}`),
      h('div', { class: 'pager-botones' },
        btn('‹ Anterior', actual - 1, { off: actual === 1 }),
        numerosDePagina(actual, paginas).map((n) => (n === '…'
          ? h('span', { class: 'pager-gap' }, '…')
          : btn(String(n), n, { actual: n === actual, 'aria-label': `Página ${n}` }))),
        btn('Siguiente ›', actual + 1, { off: actual === paginas })));
  }
  mostrar(1);
  return h('div', {}, tabla, barra);
}

export const boton = (texto, clase, onclick, extra = {}) =>
  h('button', { type: 'button', class: `btn btn-sm ${clase}`, onclick, ...extra }, texto);