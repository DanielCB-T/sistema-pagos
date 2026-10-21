import { h } from '../core/dom.js';
import { api } from '../core/api.js';
import { session } from '../core/session.js';
import { money, fecha, hoyISO } from '../core/format.js';
import { tablaDatos, boton } from '../components/table.js';
import { abrirModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { swalOk, swalError } from '../core/swal.js';

// Debe coincidir con los builders del backend (reportes.builders.js)
const TIPOS = [
  { value: 'pagos',      label: 'Pagos por periodo',         periodo: true,  icono: '💳' },
  { value: 'adeudos',    label: 'Adeudos (estado actual)',   periodo: false, icono: '📋' },
  { value: 'habitantes', label: 'Habitantes (pagos y saldos)', periodo: false, icono: '👥' },
];
const etiquetaTipo = (t) => (TIPOS.find((x) => x.value === t) || { label: t }).label;

const celda = (valor, tipo) =>
  tipo === 'moneda' ? money(valor) : tipo === 'fecha' ? fecha(valor) : valor ?? '—';

export async function render(contenedor) {
  const historial = h('div');

  // Muestra el detalle de un reporte en modal
  function mostrarEnModal(datos) {
    const { reporte, titulo, columnas, filas, resumen } = datos;
    const periodo = reporte.fecha_inicio
      ? ` · ${fecha(reporte.fecha_inicio)} al ${fecha(reporte.fecha_fin)}`
      : '';

    const contenidoModal = h('div', { class: 'modal-reporte' },
      h('p', { class: 'muted', style: 'margin-top:-.25rem' },
        `Generado el ${fecha(reporte.fecha_generacion)} por ${reporte.generado_por}${periodo}`),
      h('div', { class: 'chips' },
        resumen.map((r) => h('span', { class: 'chip chip-grande' },
          `${r.label}: `, h('strong', {}, celda(r.valor, r.tipo))))),
      h('div', { class: 'toolbar no-print', style: 'margin-top:.5rem' },
        session.can('reportes:exportar') && h('a', {
          class: 'btn btn-ok',
          href: `/api/reportes/${reporte.id_reporte}/csv`,
        }, '📥 Exportar CSV'),
        h('button', { type: 'button', class: 'btn btn-warn', onclick: () => window.print() }, '🖨 Imprimir')),
      tablaDatos({
        columns: columnas.map((c) => ({
          label: c.label,
          align: c.tipo === 'moneda' ? 'right' : undefined,
          render: (f) => celda(f[c.key], c.tipo),
        })),
        rows: filas,
        vacio: 'No hay datos para los criterios seleccionados',
      }));

    abrirModal({
      titulo: `📊 ${titulo} #${reporte.id_reporte}`,
      contenido: contenidoModal,
      ancho: true,
    });
  }

  async function cargarHistorial() {
    try {
      const filas = await api.get('/reportes');
      historial.replaceChildren(tablaDatos({
        columns: [
          { label: 'ID',       key: 'id_reporte' },
          { label: 'Tipo',     render: (r) => etiquetaTipo(r.tipo_reporte) },
          { label: 'Periodo',  render: (r) => (r.fecha_inicio ? `${fecha(r.fecha_inicio)} – ${fecha(r.fecha_fin)}` : '—') },
          { label: 'Generado', render: (r) => fecha(r.fecha_generacion) },
          { label: 'Por',      key: 'generado_por' },
        ],
        rows: filas,
        vacio: 'Aún no se han generado reportes',
        acciones: (r) => [
          boton('👁 Ver', 'btn-info', async () => {
            try {
              mostrarEnModal(await api.get(`/reportes/${r.id_reporte}`));
            } catch (e) {
              toast(e.message, 'error');
              swalError('Error al cargar reporte', e.message);
            }
          }),
          session.can('reportes:exportar') &&
            h('a', { class: 'btn btn-sm btn-ok', href: `/api/reportes/${r.id_reporte}/csv` }, '📥 CSV'),
        ],
      }));
    } catch (err) {
      swalError('Error al cargar historial', err.message);
    }
  }

  // ---- Formulario para generar ----
  const tipo   = h('select', { id: 'tipo', 'aria-label': 'Tipo de reporte' },
    TIPOS.map((t) => h('option', { value: t.value }, `${t.icono} ${t.label}`)));
  const inicio = h('input', { id: 'inicio', type: 'date', value: `${hoyISO().slice(0, 8)}01` });
  const fin    = h('input', { id: 'fin',    type: 'date', value: hoyISO() });

  const camposFecha = h('div', { class: 'fechas' },
    h('div', { class: 'field' }, h('label', { for: 'inicio' }, 'Fecha inicial'), inicio),
    h('div', { class: 'field' }, h('label', { for: 'fin' },   'Fecha final'),   fin));

  const actualizarCampos = () => {
    camposFecha.hidden = !TIPOS.find((t) => t.value === tipo.value)?.periodo;
  };
  tipo.addEventListener('change', actualizarCampos);
  actualizarCampos();

  const generar = h('button', { type: 'submit', class: 'btn btn-ok' }, '📊 Generar reporte');

  const form = h('form', { class: 'reporte-panel', novalidate: true },
    h('h2', { style: 'margin-top:0' }, '⚙️ Generar nuevo reporte'),
    h('div', { class: 'field', style: 'max-width:400px' },
      h('label', { for: 'tipo' }, 'Tipo de reporte'),
      tipo),
    camposFecha,
    h('div', { class: 'form-actions', style: 'margin-top:.75rem' }, generar));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    generar.disabled = true;
    generar.textContent = '⏳ Generando…';
    try {
      const cuerpo = { tipo_reporte: tipo.value };
      if (!camposFecha.hidden) Object.assign(cuerpo, { fecha_inicio: inicio.value, fecha_fin: fin.value });
      const datos = await api.post('/reportes', cuerpo);
      mostrarEnModal(datos);
      await swalOk('¡Reporte generado!', `El reporte #${datos.reporte.id_reporte} fue creado exitosamente.`);
      await cargarHistorial();
    } catch (err) {
      toast(err.message, 'error');
      swalError('Error al generar reporte', err.message);
    } finally {
      generar.disabled = false;
      generar.textContent = '📊 Generar reporte';
    }
  });

  contenedor.replaceChildren(
    h('h1', {}, '📊 Reportes'),
    h('div', { class: 'reportes-grid' },
      form,
      h('div', { class: 'reporte-panel no-print' },
        h('h2', { style: 'margin-top:0' }, '🕑 Historial de reportes'),
        historial)));
  await cargarHistorial();
}
