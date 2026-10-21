import { h } from '../core/dom.js';

const ETIQUETAS = { pendiente: 'Pendiente', parcial: 'Parcial', pagado: 'Pagado', activo: 'Activo', bloqueado: 'Bloqueado' };
export const POR_PAGINA = 10;
export const OPCIONES_PAGINA = [5, 10, 20];

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
 * Tabla de datos con paginación en el navegador y selector de registros por página.
 * columns: [{ label, key, render:(fila)=>Node|string, align:'right' }]
 * acciones: (fila) => Node[]   (columna de botones; se oculta al imprimir)
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
  let tamano  = porPagina;
  let paginas = Math.ceil(total / tamano);

  // Si solo hay 1 página con el tamaño actual, aún mostramos el selector de registros
  // (para que el usuario pueda cambiar a menos registros por página si quiere).
  // Pero si hay menos registros que el mínimo posible (5), simplemente mostramos la tabla.
  if (total <= 5) return tabla;

  const barra  = h('nav', { class: 'pager no-print', 'aria-label': 'Paginación' });
  let actual   = 1;

  function mostrar(n, nuevoTamano) {
    if (nuevoTamano !== undefined) { tamano = nuevoTamano; }
    const totalPaginas = Math.ceil(total / tamano);
    actual = Math.min(Math.max(1, n), totalPaginas);
    const desde = (actual - 1) * tamano;
    filas.forEach((tr, i) => { tr.hidden = i < desde || i >= desde + tamano; });
    const hasta = Math.min(desde + tamano, total);

    const btn = (texto, destino, extra = {}) =>
      h('button', { type: 'button', class: `btn btn-sm btn-ghost${extra.actual ? ' pag-actual' : ''}`, disabled: extra.off, 'aria-current': extra.actual ? 'page' : undefined, 'aria-label': extra['aria-label'], onclick: () => mostrar(destino) }, texto);

    // Selector de registros por página
    const selector = h('select', { 'aria-label': 'Registros por página', style: 'padding:.28rem .5rem;font-size:.82rem;' },
      OPCIONES_PAGINA.map((op) => h('option', { value: op, selected: op === tamano }, `${op} por página`)));
    selector.addEventListener('change', () => mostrar(1, Number(selector.value)));

    barra.replaceChildren(
      h('div', { class: 'registros-selector' },
        h('span', {}, `${desde + 1}–${hasta} de ${total}`),
        selector),
      h('div', { class: 'pager-botones' },
        btn('‹ Anterior', actual - 1, { off: actual === 1 }),
        numerosDePagina(actual, totalPaginas).map((n) => (n === '…'
          ? h('span', { class: 'pager-gap' }, '…')
          : btn(String(n), n, { actual: n === actual, 'aria-label': `Página ${n}` }))),
        btn('Siguiente ›', actual + 1, { off: actual === totalPaginas })));
  }
  mostrar(1, tamano);
  return h('div', {}, tabla, barra);
}

export const boton = (texto, clase, onclick, extra = {}) =>
  h('button', { type: 'button', class: `btn btn-sm ${clase}`, onclick, ...extra }, texto);