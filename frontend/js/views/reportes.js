import { h } from '../core/dom.js';
import { api } from '../core/api.js';
import { session } from '../core/session.js';
import { money, fecha, hoyISO } from '../core/format.js';
import { tablaDatos, boton } from '../components/table.js';
import { toast } from '../components/toast.js';

// Debe coincidir con los builders del backend (reportes.builders.js)
const TIPOS = [
  { value: 'pagos', label: 'Pagos por periodo', periodo: true },
  { value: 'adeudos', label: 'Adeudos (estado actual)' },
  { value: 'habitantes', label: 'Habitantes (pagos y saldos)' },
];
const etiquetaTipo = (t) => (TIPOS.find((x) => x.value === t) || { label: t }).label;

const celda = (valor, tipo) => (tipo === 'moneda' ? money(valor) : tipo === 'fecha' ? fecha(valor) : valor ?? '—');

export async function render(contenedor) {
  const resultado = h('div', { class: 'reporte-resultado' });
  const historial = h('div');

  function mostrar(datos) {
    const { reporte, titulo, columnas, filas, resumen } = datos;
    const periodo = reporte.fecha_inicio ? ` · ${fecha(reporte.fecha_inicio)} al ${fecha(reporte.fecha_fin)}` : '';
    resultado.replaceChildren(
      h('h2', {}, `${titulo} #${reporte.id_reporte}`),
      h('p', { class: 'muted' }, `Generado el ${fecha(reporte.fecha_generacion)} por ${reporte.generado_por}${periodo}`),
      h('div', { class: 'chips' }, resumen.map((r) => h('span', { class: 'chip chip-grande' }, `${r.label}: `, h('strong', {}, celda(r.valor, r.tipo))))),
      h('div', { class: 'toolbar no-print' },
        session.can('reportes:exportar') && h('a', { class: 'btn btn-ok', href: `/api/reportes/${reporte.id_reporte}/csv` }, 'Exportar CSV (Excel)'),
        h('button', { type: 'button', class: 'btn btn-warn', onclick: () => window.print() }, 'Imprimir')),
      tablaDatos({
        columns: columnas.map((c) => ({ label: c.label, align: c.tipo === 'moneda' ? 'right' : undefined, render: (f) => celda(f[c.key], c.tipo) })),
        rows: filas,
        vacio: 'No hay datos para los criterios seleccionados',
      }));
    resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function cargarHistorial() {
    const filas = await api.get('/reportes');
    historial.replaceChildren(tablaDatos({
      columns: [
        { label: 'ID', key: 'id_reporte' },
        { label: 'Tipo', render: (r) => etiquetaTipo(r.tipo_reporte) },
        { label: 'Periodo', render: (r) => (r.fecha_inicio ? `${fecha(r.fecha_inicio)} – ${fecha(r.fecha_fin)}` : '—') },
        { label: 'Generado', render: (r) => fecha(r.fecha_generacion) },
        { label: 'Por', key: 'generado_por' },
      ],
      rows: filas,
      vacio: 'Aún no se han generado reportes',
      acciones: (r) => [
        boton('Ver', 'btn-info', async () => { try { mostrar(await api.get(`/reportes/${r.id_reporte}`)); } catch (e) { toast(e.message, 'error'); } }),
        session.can('reportes:exportar') && h('a', { class: 'btn btn-sm btn-ok', href: `/api/reportes/${r.id_reporte}/csv` }, 'CSV'),
      ],
    }));
  }

  // --- Formulario para generar ---
  const tipo = h('select', { id: 'tipo', 'aria-label': 'Tipo de reporte' }, TIPOS.map((t) => h('option', { value: t.value }, t.label)));
  const inicio = h('input', { id: 'inicio', type: 'date', value: `${hoyISO().slice(0, 8)}01` });
  const fin = h('input', { id: 'fin', type: 'date', value: hoyISO() });
  const camposFecha = h('div', { class: 'fechas' },
    h('div', { class: 'field' }, h('label', { for: 'inicio' }, 'Fecha inicial'), inicio),
    h('div', { class: 'field' }, h('label', { for: 'fin' }, 'Fecha final'), fin));
  const actualizarCampos = () => { camposFecha.hidden = !TIPOS.find((t) => t.value === tipo.value).periodo; };
  tipo.addEventListener('change', actualizarCampos);
  actualizarCampos();

  const generar = h('button', { type: 'submit', class: 'btn btn-ok' }, 'Generar reporte');
  const form = h('form', { class: 'panel form no-print', novalidate: true },
    h('div', { class: 'field' }, h('label', { for: 'tipo' }, 'Tipo de reporte'), tipo),
    camposFecha,
    h('div', { class: 'form-actions' }, generar, h('a', { href: '#/inicio', class: 'btn btn-ghost' }, 'Volver al menú principal')));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    generar.disabled = true;
    try {
      const cuerpo = { tipo_reporte: tipo.value };
      if (!camposFecha.hidden) Object.assign(cuerpo, { fecha_inicio: inicio.value, fecha_fin: fin.value });
      mostrar(await api.post('/reportes', cuerpo));
      await cargarHistorial();
    } catch (err) { toast(err.message, 'error'); } finally { generar.disabled = false; }
  });

  contenedor.replaceChildren(
    h('h1', {}, 'Reportes'), form, resultado,
    h('h2', { class: 'no-print' }, 'Historial de reportes generados'), h('div', { class: 'no-print' }, historial));
  await cargarHistorial();
}
