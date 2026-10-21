import { h } from '../core/dom.js';
import { api, query } from '../core/api.js';
import { session } from '../core/session.js';
import { money, fecha, folio } from '../core/format.js';
import { tablaDatos, boton, insignia } from '../components/table.js';
import { crearFormulario } from '../components/form.js';
import { abrirModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { swalOk, swalError, swalConfirmar } from '../core/swal.js';

export async function render(contenedor) {
  let q = '';
  const zona = h('div');

  async function cargar() {
    try {
      const filas = await api.get(`/habitantes${query({ q })}`);
      zona.replaceChildren(tablaDatos({
        columns: [
          { label: 'ID', key: 'id_habitante' },
          { label: 'Núm. familia', key: 'numero_familia' },
          { label: 'Nombre completo', key: 'nombre_completo' },
          { label: 'Dirección', key: 'direccion' },
          { label: 'Teléfono', key: 'telefono' },
        ],
        rows: filas,
        vacio: 'No se encontraron habitantes',
        acciones: (f) => [
          boton('Ver', 'btn-secondary', () => verDetalle(f)),
          session.can('habitantes:editar')   && boton('Editar',   'btn-info',   () => formulario(f)),
          session.can('habitantes:eliminar') && boton('Eliminar', 'btn-danger', () => eliminar(f)),
        ],
      }));
    } catch (err) {
      swalError('Error al cargar habitantes', err.message);
    }
  }

  // Ver expediente / detalle del habitante
  async function verDetalle(hab) {
    let contenido;
    try {
      const [adeudos, pagos] = await Promise.all([
        api.get(`/adeudos${query({ id_habitante: hab.id_habitante })}`),
        api.get(`/pagos${query({ id_habitante: hab.id_habitante })}`),
      ]);
      const listaPagos = (pagos.data || pagos);

      const totalDeuda = adeudos.reduce((sum, a) => sum + Number(a.monto_pendiente || 0), 0);
      const totalPagado = listaPagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);

      contenido = h('div', { class: 'detalle-habitante' },
        h('div', { class: 'chips', style: 'margin-bottom:1rem' },
          h('span', { class: 'chip chip-grande' }, 'Nombre: ', h('strong', {}, hab.nombre_completo)),
          h('span', { class: 'chip chip-grande' }, 'Familia: ', h('strong', {}, hab.numero_familia || 's/f')),
          h('span', { class: 'chip chip-grande' }, 'Teléfono: ', h('strong', {}, hab.telefono || '—')),
          h('span', { class: 'chip chip-grande' }, 'Saldo pendiente total: ', h('strong', { style: totalDeuda > 0 ? 'color:var(--peligro)' : 'color:var(--ok)' }, money(totalDeuda))),
          h('span', { class: 'chip chip-grande' }, 'Total aportado: ', h('strong', {}, money(totalPagado)))),
        hab.direccion ? h('p', { class: 'muted', style: 'margin-bottom:1rem' },
          h('strong', {}, 'Dirección: '), hab.direccion) : null,
        h('h3', { style: 'margin-top:1rem' }, 'Adeudos registrados'),
        tablaDatos({
          columns: [
            { label: 'ID', key: 'id_adeudo' },
            { label: 'Total', align: 'right', render: (a) => money(a.monto_total) },
            { label: 'Pagado', align: 'right', render: (a) => money(a.monto_pagado) },
            { label: 'Pendiente', align: 'right', render: (a) => money(a.monto_pendiente) },
            { label: 'Estado', render: (a) => insignia(a.estado) },
          ],
          rows: adeudos,
          vacio: 'Sin adeudos registrados',
        }),
        h('h3', { style: 'margin-top:1.5rem' }, 'Historial de pagos'),
        tablaDatos({
          columns: [
            { label: 'Folio', render: (p) => folio(p.id_pago) },
            { label: 'Fecha', render: (p) => fecha(p.fecha) },
            { label: 'Concepto', key: 'concepto' },
            { label: 'Monto', align: 'right', render: (p) => money(p.monto) },
            { label: 'Adeudo', render: (p) => (p.id_adeudo ? `#${p.id_adeudo}` : 'Libre') },
          ],
          rows: listaPagos,
          vacio: 'Sin pagos registrados',
        })
      );
    } catch (err) {
      contenido = h('p', { class: 'form-error' }, err.message);
    }

    abrirModal({
      titulo: `Expediente · ${hab.nombre_completo}`,
      contenido,
      ancho: true,
    });
  }

  function formulario(hab) {
    let modal;
    const f = crearFormulario({
      values: hab || {},
      fields: [
        { name: 'numero_familia',  label: 'Número de familia',  required: true, maxlength: 20,
          help: 'Ej: 001, F-023. Campo obligatorio.' },
        { name: 'nombre_completo', label: 'Nombre completo',    required: true, maxlength: 100,
          placeholder: 'Apellido Apellido, Nombre(s)' },
        { name: 'direccion',       label: 'Dirección',          required: true, type: 'textarea', maxlength: 500,
          placeholder: 'Calle, número, colonia…' },
        { name: 'telefono',        label: 'Teléfono',           required: true, maxlength: 15, type: 'tel',
          placeholder: '10 dígitos', help: 'Mínimo 10 dígitos.' },
      ],
      onCancel: () => modal.close(),
      onSubmit: async (v) => {
        // Validaciones adicionales
        if (!/^\d{10,15}$/.test(v.telefono.replace(/\s|-/g, ''))) {
          throw new Error('El teléfono debe tener entre 10 y 15 dígitos.');
        }
        if (hab) {
          await api.put(`/habitantes/${hab.id_habitante}`, v);
        } else {
          await api.post('/habitantes', v);
        }
        modal.close();
        toast(hab ? 'Habitante actualizado' : 'Habitante registrado');
        await swalOk(
          hab ? '¡Habitante actualizado!' : '¡Habitante registrado!',
          hab
            ? `Los datos de "${v.nombre_completo}" fueron actualizados correctamente.`
            : `"${v.nombre_completo}" fue registrado en el sistema.`
        );
        await cargar();
      },
    });
    modal = abrirModal({ titulo: hab ? 'Modificar habitante' : 'Agregar nuevo habitante', contenido: f.el });
  }

  async function eliminar(hab) {
    const ok = await swalConfirmar({
      titulo: 'Eliminar habitante',
      mensaje: `¿Desea eliminar a "${hab.nombre_completo}"? Esta acción no se puede deshacer.`,
      textoOk: 'Sí, eliminar',
      textoCancelar: 'Cancelar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.del(`/habitantes/${hab.id_habitante}`);
      toast('Habitante eliminado');
      await swalOk('¡Eliminado!', `"${hab.nombre_completo}" fue eliminado del sistema.`);
      await cargar();
    } catch (err) {
      toast(err.message, 'error');
      swalError('Error al eliminar', err.message);
    }
  }

  const buscador = h('input', { type: 'search', placeholder: 'Buscar por nombre, familia, teléfono o dirección', 'aria-label': 'Buscar habitante' });
  contenedor.replaceChildren(
    h('h1', {}, 'Gestión de Habitantes'),
    h('form', { class: 'toolbar no-print', onsubmit: (e) => { e.preventDefault(); q = buscador.value.trim(); cargar(); } },
      buscador,
      h('button', { type: 'submit', class: 'btn btn-warn' }, 'Buscar'),
      session.can('habitantes:crear') && h('button', { type: 'button', class: 'btn btn-ok', onclick: () => formulario(null) }, 'Agregar habitante'),
      h('div', { class: 'toolbar-sep' }),
      h('button', { type: 'button', class: 'btn btn-warn', onclick: () => window.print() }, 'Imprimir lista')),
    zona);
  await cargar();
}
