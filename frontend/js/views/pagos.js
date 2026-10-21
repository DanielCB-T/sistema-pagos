import { h } from '../core/dom.js';
import { api, query } from '../core/api.js';
import { session } from '../core/session.js';
import { money, fecha, folio, hoyISO } from '../core/format.js';
import { tablaDatos, boton } from '../components/table.js';
import { crearFormulario } from '../components/form.js';
import { abrirModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { swalOk, swalError, swalConfirmar } from '../core/swal.js';

const CONCEPTOS = ['Cuota de mantenimiento', 'Aportación voluntaria', 'Pago de asamblea', 'Pago de luz', 'Pago de agua', 'Faena / tequio'];
const TAMANO = 10;

export async function render(contenedor) {
  const filtro   = { q: '', desde: '', hasta: '', page: 1 };
  const zona     = h('div');
  const resumen  = h('p', { class: 'muted' });
  const paginador = h('div', { class: 'pager no-print' });

  async function cargar() {
    try {
      const r = await api.get(`/pagos${query({ ...filtro, pageSize: TAMANO })}`);
      const paginas = Math.max(1, Math.ceil(r.total / TAMANO));
      if (!r.data.length && filtro.page > 1) { filtro.page = paginas; return cargar(); }
      resumen.textContent = `${r.total} pago(s) · Total: ${money(r.suma)}`;
      zona.replaceChildren(tablaDatos({
        columns: [
          { label: 'Folio',     render: (p) => folio(p.id_pago) },
          { label: 'Fecha',     render: (p) => fecha(p.fecha) },
          { label: 'Habitante', key: 'nombre_completo' },
          { label: 'Concepto',  key: 'concepto' },
          { label: 'Monto',     align: 'right', render: (p) => money(p.monto) },
          { label: 'Adeudo',    render: (p) => (p.id_adeudo ? `#${p.id_adeudo}` : '—') },
          { label: 'Registró',  key: 'registrado_por' },
        ],
        rows: r.data,
        vacio: 'No se encontraron pagos con esos criterios',
        acciones: (p) => [
          session.can('pagos:comprobante') && h('a', {
            class: 'btn btn-sm btn-warn',
            href: `/api/pagos/${p.id_pago}/comprobante`,
            target: '_blank', rel: 'noopener',
          }, '📄 Comprobante'),
          session.can('pagos:editar')   && boton('✏️ Modificar', 'btn-info',   () => formularioEdicion(p)),
          session.can('pagos:eliminar') && boton('🗑 Eliminar',  'btn-danger', () => eliminar(p)),
        ],
      }));
      const desde = r.total ? (filtro.page - 1) * TAMANO + 1 : 0;
      const hasta = Math.min(filtro.page * TAMANO, r.total);
      paginador.replaceChildren(
        h('div', { class: 'registros-selector' },
          h('span', {}, `${desde}–${hasta} de ${r.total}`)),
        h('div', { class: 'pager-botones' },
          boton('‹ Anterior', 'btn-ghost', () => { filtro.page -= 1; cargar(); }, { disabled: filtro.page <= 1 }),
          h('span', { class: 'pager-info' }, `Pág. ${filtro.page} / ${paginas}`),
          boton('Siguiente ›', 'btn-ghost', () => { filtro.page += 1; cargar(); }, { disabled: filtro.page >= paginas })));
    } catch (err) {
      swalError('Error al cargar pagos', err.message);
    }
  }

  // ----- Registrar pago -----
  async function formularioNuevo() {
    const habs = await api.get('/habitantes');
    let modal;
    const f = crearFormulario({
      values: { fecha: hoyISO() },
      fields: [
        {
          name: 'id_habitante', label: 'Habitante', type: 'select', required: true,
          options: [{ value: '', label: 'Seleccionar habitante' },
            ...habs.map((x) => ({ value: x.id_habitante, label: `${x.nombre_completo} (${x.numero_familia || 's/f'})` }))],
          onChange: async (idHab, form) => {
            const base = [{ value: '', label: 'Sin adeudo (aportación libre)' }];
            if (!idHab) return form.setOptions('id_adeudo', base);
            try {
              const ad = await api.get(`/adeudos${query({ id_habitante: idHab, abiertos: 'true' })}`);
              form.setOptions('id_adeudo', [...base,
                ...ad.map((a) => ({ value: a.id_adeudo, label: `Adeudo #${a.id_adeudo} · pendiente ${money(a.monto_pendiente)}` }))]);
            } catch (err) { toast(err.message, 'error'); }
          },
        },
        { name: 'id_adeudo', label: 'Adeudo a abonar', type: 'select',
          options: [{ value: '', label: 'Sin adeudo (aportación libre)' }],
          help: 'El pago reducirá el saldo pendiente del adeudo elegido.' },
        { name: 'concepto', label: 'Concepto', required: true, maxlength: 100, datalist: CONCEPTOS },
        { name: 'monto', label: 'Monto (MXN)', type: 'number', step: '0.01', min: '0.01', required: true },
        { name: 'fecha', label: 'Fecha', type: 'date' },
        { name: 'observaciones', label: 'Observaciones', type: 'textarea', maxlength: 1000 },
      ],
      onCancel: () => modal.close(),
      onSubmit: async (v) => {
        const pago = await api.post('/pagos', v);
        modal.close();
        toast('Pago registrado');
        await swalOk('¡Pago registrado!', `Folio ${folio(pago.id_pago)} registrado correctamente.`);
        await cargar();
        if (session.can('pagos:comprobante')) {
          const ver = await swalConfirmar({
            titulo: '¿Abrir comprobante?',
            mensaje: `Folio ${folio(pago.id_pago)}. ¿Desea abrir el comprobante ahora?`,
            textoOk: '📄 Ver comprobante',
            textoCancelar: 'Ahora no',
          });
          if (ver) window.open(`/api/pagos/${pago.id_pago}/comprobante`, '_blank');
        }
      },
    });
    modal = abrirModal({ titulo: '💳 Agregar pago', contenido: f.el });
  }

  // ----- Modificar pago -----
  function formularioEdicion(p) {
    let modal;
    const f = crearFormulario({
      values: { concepto: p.concepto, monto: p.monto, fecha: p.fecha, observaciones: p.observaciones },
      fields: [
        { name: 'concepto', label: 'Concepto', required: true, maxlength: 100, datalist: CONCEPTOS },
        { name: 'monto', label: 'Monto (MXN)', type: 'number', step: '0.01', min: '0.01', required: true,
          help: p.id_adeudo ? 'Si cambia el monto se ajusta el saldo del adeudo asociado.' : undefined },
        { name: 'fecha', label: 'Fecha', type: 'date' },
        { name: 'observaciones', label: 'Observaciones', type: 'textarea', maxlength: 1000 },
      ],
      onCancel: () => modal.close(),
      onSubmit: async (v) => {
        await api.put(`/pagos/${p.id_pago}`, v);
        modal.close();
        toast('Pago actualizado');
        await swalOk('¡Pago actualizado!', `El pago ${folio(p.id_pago)} fue modificado correctamente.`);
        await cargar();
      },
    });
    modal = abrirModal({ titulo: `✏️ Modificar ${folio(p.id_pago)} · ${p.nombre_completo}`, contenido: f.el });
  }

  async function eliminar(p) {
    const extra = p.id_adeudo ? ' Se restará del adeudo asociado.' : '';
    const ok = await swalConfirmar({
      titulo: '🗑 Eliminar pago',
      mensaje: `¿Eliminar el pago ${folio(p.id_pago)} de ${p.nombre_completo}?${extra}`,
      textoOk: 'Sí, eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.del(`/pagos/${p.id_pago}`);
      toast('Pago eliminado');
      await swalOk('¡Eliminado!', `El pago ${folio(p.id_pago)} fue eliminado.`);
      await cargar();
    } catch (err) {
      toast(err.message, 'error');
      swalError('Error al eliminar', err.message);
    }
  }

  const q      = h('input', { type: 'search', placeholder: '🔍 Buscar por habitante, concepto o folio', 'aria-label': 'Buscar pago' });
  const desde  = h('input', { type: 'date', 'aria-label': 'Desde' });
  const hasta  = h('input', { type: 'date', 'aria-label': 'Hasta' });
  const limpiar = () => {
    q.value = desde.value = hasta.value = '';
    Object.assign(filtro, { q: '', desde: '', hasta: '', page: 1 });
    cargar();
  };

  contenedor.replaceChildren(
    h('h1', {}, '💳 Gestión de Pagos'),
    h('form', {
      class: 'toolbar no-print',
      onsubmit: (e) => { e.preventDefault(); Object.assign(filtro, { q: q.value.trim(), desde: desde.value, hasta: hasta.value, page: 1 }); cargar(); },
    },
      q,
      h('label', { class: 'inline' }, '📅 Desde', desde),
      h('label', { class: 'inline' }, 'Hasta', hasta),
      h('button', { type: 'submit', class: 'btn btn-warn' }, '🔍 Buscar'),
      h('button', { type: 'button', class: 'btn btn-ghost', onclick: limpiar }, '✕ Quitar filtros'),
      session.can('pagos:crear') && h('button', { type: 'button', class: 'btn btn-ok', onclick: formularioNuevo }, '+ Agregar pago'),
      h('div', { class: 'toolbar-sep' }),
      h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => window.print() }, '🖨 Imprimir')),
    resumen, zona, paginador);
  await cargar();
}
