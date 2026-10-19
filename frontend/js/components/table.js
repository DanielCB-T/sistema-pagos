import { h } from '../core/dom.js';

const ETIQUETAS = { pendiente: 'Pendiente', parcial: 'Parcial', pagado: 'Pagado', activo: 'Activo', bloqueado: 'Bloqueado' };

export const insignia = (estado) => h('span', { class: `badge badge-${estado}` }, ETIQUETAS[estado] || estado);

/**
 * Tabla de datos.
 * columns: [{ label, key, render:(fila)=>Node|string, align:'right' }]
 * acciones: (fila) => Node[]   (columna de botones; se oculta al imprimir)
 */
export function tablaDatos({ columns, rows, acciones, vacio = 'No hay registros para mostrar' }) {
  if (!rows.length) return h('p', { class: 'empty' }, vacio);
  return h('div', { class: 'table-wrap' },
    h('table', { class: 'table' },
      h('thead', {}, h('tr', {},
        columns.map((c) => h('th', { class: c.align === 'right' ? 'num' : '' }, c.label)),
        acciones ? h('th', { class: 'col-acciones' }, 'Acciones') : null)),
      h('tbody', {}, rows.map((fila) => h('tr', {},
        columns.map((c) => h('td', { class: c.align === 'right' ? 'num' : '' }, c.render ? c.render(fila) : fila[c.key] ?? '—')),
        acciones ? h('td', { class: 'col-acciones' }, h('div', { class: 'row-actions' }, acciones(fila))) : null)))));
}

export const boton = (texto, clase, onclick, extra = {}) =>
  h('button', { type: 'button', class: `btn btn-sm ${clase}`, onclick, ...extra }, texto);
