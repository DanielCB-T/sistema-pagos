import { h } from '../core/dom.js';
import { api, query } from '../core/api.js';
import { session } from '../core/session.js';
import { money, fecha, folio, hoyISO } from '../core/format.js';
import { tablaDatos, boton, insignia } from '../components/table.js';
import { crearFormulario } from '../components/form.js';
import { abrirModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { swalOk, swalError, swalConfirmar } from '../core/swal.js';

export async function render(contenedor) {
  const filtro = { q: '', estado: '' };
  const zona = h('div');

  async function cargar() {
    try {
      const filas = await api.get(`/adeudos${query(filtro)}`);
      zona.replaceChildren(tablaDatos({
        columns: [
          { label: 'ID',        key: 'id_adeudo' },
          { label: 'Habitante', key: 'nombre_completo' },
          { label: 'Familia',   key: 'numero_familia' },
          { label: 'Total',     align: 'right', render: (f) => money(f.monto_total) },
          { label: 'Pagado',    align: 'right', render: (f) => money(f.monto_pagado) },
          { label: 'Pendiente', align: 'right', render: (f) => money(f.monto_pendiente) },
          { label: 'Estado',    render: (f) => insignia(f.estado) },
        ],
        rows: filas,
        vacio: 'No se encontraron adeudos',
        acciones: (f) => [
          // Abonar pago directo
          session.can('pagos:crear') && f.monto_pendiente > 0 &&
            boton('Abonar', 'btn-ok', () => formularioAbonar(f)),
          // Ver detalle
          boton('Ver', 'btn-secondary', () => verDetalle(f)),
          session.can('adeudos:editar') &&
            boton('Modificar', 'btn-info', () => formulario(f)),
          session.can('adeudos:eliminar') &&
            boton('Eliminar', 'btn-danger', () => eliminar(f)),
        ],
      }));
    } catch (err) {
      swalError('Error al cargar adeudos', err.message);
    }
  }

  // Ver detalle de adeudo y sus abonos
  async function verDetalle(a) {
    let contenido;
    try {
      const pagos = await api.get(`/pagos${query({ id_adeudo: a.id_adeudo })}`);
      const listaPagos = (pagos.data || pagos);

      contenido = h('div', { class: 'detalle-modal' },
        h('div', { class: 'chips', style: 'margin-bottom:1rem' },
          h('span', { class: 'chip chip-grande' }, 'Habitante: ', h('strong', {}, a.nombre_completo)),
          h('span', { class: 'chip chip-grande' }, 'Familia: ', h('strong', {}, a.numero_familia || 's/f')),
          h('span', { class: 'chip chip-grande' }, 'Monto total: ', h('strong', {}, money(a.monto_total))),
          h('span', { class: 'chip chip-grande' }, 'Pagado: ', h('strong', {}, money(a.monto_pagado))),
          h('span', { class: 'chip chip-grande' }, 'Pendiente: ', h('strong', {}, money(a.monto_pendiente))),
          h('span', { class: 'chip chip-grande' }, 'Estado: ', insignia(a.estado))),
        h('h3', { style: 'margin-top:1.25rem' }, 'Abonos registrados para este adeudo'),
        tablaDatos({
          columns: [
            { label: 'Folio', render: (p) => folio(p.id_pago) },
            { label: 'Fecha', render: (p) => fecha(p.fecha) },
            { label: 'Concepto', key: 'concepto' },
            { label: 'Monto', align: 'right', render: (p) => money(p.monto) },
            { label: 'Registró', key: 'registrado_por' },
          ],
          rows: listaPagos,
          vacio: 'Aún no se han registrado abonos a este adeudo',
        })
      );
    } catch (err) {
      contenido = h('p', { class: 'form-error' }, err.message);
    }

    abrirModal({
      titulo: `Detalle del Adeudo #${a.id_adeudo}`,
      contenido,
      ancho: true,
    });
  }

  // Registrar abono directo a este adeudo
  function formularioAbonar(a) {
    let modal;
    const f = crearFormulario({
      values: {
        concepto: `Abono a adeudo #${a.id_adeudo}`,
        monto: a.monto_pendiente,
        fecha: hoyISO(),
      },
      fields: [
        { name: 'habitante_info', label: 'Habitante', type: 'readonly', value: `${a.nombre_completo} (${a.numero_familia || 's/f'})` },
        { name: 'adeudo_info', label: 'Saldo pendiente del adeudo', type: 'readonly', value: money(a.monto_pendiente) },
        { name: 'concepto', label: 'Concepto', required: true, maxlength: 100 },
        { name: 'monto', label: 'Monto a pagar (MXN)', type: 'number', step: '0.01', min: '0.01', max: a.monto_pendiente, required: true },
        { name: 'fecha', label: 'Fecha', type: 'date' },
        { name: 'observaciones', label: 'Observaciones', type: 'textarea', maxlength: 1000 },
      ],
      onCancel: () => modal.close(),
      onSubmit: async (v) => {
        const pago = await api.post('/pagos', {
          id_habitante: a.id_habitante,
          id_adeudo: a.id_adeudo,
          concepto: v.concepto,
          monto: v.monto,
          fecha: v.fecha,
          observaciones: v.observaciones,
        });
        modal.close();
        toast('Abono registrado correctamente');
        await swalOk('¡Abono registrado!', `Pago con folio ${folio(pago.id_pago)} aplicado al adeudo #${a.id_adeudo}.`);
        await cargar();
        if (session.can('pagos:comprobante')) {
          const ver = await swalConfirmar({
            titulo: '¿Abrir comprobante?',
            mensaje: `Folio ${folio(pago.id_pago)}. ¿Desea abrir el comprobante ahora?`,
            textoOk: 'Ver comprobante',
            textoCancelar: 'Ahora no',
          });
          if (ver) window.open(`/api/pagos/${pago.id_pago}/comprobante`, '_blank');
        }
      },
    });
    modal = abrirModal({
      titulo: `Abonar a Adeudo #${a.id_adeudo} · ${a.nombre_completo}`,
      contenido: f.el,
    });
  }

  async function formulario(adeudo) {
    let modal;
    const campos = [];
    if (!adeudo) {
      const habs = await api.get('/habitantes');
      campos.push({
        name: 'id_habitante', label: 'Habitante', type: 'select', required: true,
        options: [{ value: '', label: 'Seleccionar habitante' },
          ...habs.map((x) => ({ value: x.id_habitante, label: `${x.nombre_completo} (${x.numero_familia || 's/f'})` }))],
      });
    }
    campos.push({
      name: 'monto_total', label: 'Monto total del adeudo (MXN)',
      type: 'number', step: '0.01', min: '0.01', required: true,
    });
    const f = crearFormulario({
      values: adeudo ? { monto_total: adeudo.monto_total } : {},
      fields: campos,
      onCancel: () => modal.close(),
      onSubmit: async (v) => {
        if (adeudo) await api.put(`/adeudos/${adeudo.id_adeudo}`, { monto_total: v.monto_total });
        else await api.post('/adeudos', v);
        modal.close();
        toast(adeudo ? 'Adeudo actualizado' : 'Adeudo registrado');
        await swalOk(
          adeudo ? '¡Adeudo actualizado!' : '¡Adeudo registrado!',
          adeudo
            ? `El adeudo #${adeudo.id_adeudo} fue actualizado correctamente.`
            : 'El adeudo fue registrado en el sistema.'
        );
        await cargar();
      },
    });
    modal = abrirModal({
      titulo: adeudo ? `Modificar adeudo #${adeudo.id_adeudo}` : 'Registrar adeudo',
      contenido: f.el,
    });
  }

  async function eliminar(a) {
    const ok = await swalConfirmar({
      titulo: 'Eliminar adeudo',
      mensaje: `¿Desea eliminar el adeudo #${a.id_adeudo} de ${a.nombre_completo}? Esta acción no se puede deshacer.`,
      textoOk: 'Sí, eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.del(`/adeudos/${a.id_adeudo}`);
      toast('Adeudo eliminado');
      await swalOk('¡Eliminado!', `El adeudo #${a.id_adeudo} fue eliminado.`);
      await cargar();
    } catch (err) {
      toast(err.message, 'error');
      swalError('Error al eliminar', err.message);
    }
  }

  const buscador = h('input', { type: 'search', placeholder: 'Buscar por habitante o familia', 'aria-label': 'Buscar adeudo' });
  const estado   = h('select', { 'aria-label': 'Filtrar por estado' },
    [['', 'Todos los estados'], ['pendiente', 'Pendientes'], ['parcial', 'Parciales'], ['pagado', 'Pagados']]
      .map(([v, t]) => h('option', { value: v }, t)));

  contenedor.replaceChildren(
    h('h1', {}, 'Gestión de Adeudos'),
    h('form', {
      class: 'toolbar no-print',
      onsubmit: (e) => { e.preventDefault(); filtro.q = buscador.value.trim(); filtro.estado = estado.value; cargar(); },
    },
      buscador,
      h('label', { class: 'inline' }, 'Estado:', estado),
      h('button', { type: 'submit', class: 'btn btn-warn' }, 'Buscar'),
      session.can('adeudos:crear') && h('button', { type: 'button', class: 'btn btn-ok', onclick: () => formulario(null) }, 'Registrar adeudo'),
      h('div', { class: 'toolbar-sep' }),
      h('button', { type: 'button', class: 'btn btn-warn', onclick: () => window.print() }, 'Imprimir lista')),
    zona);
  await cargar();
}
