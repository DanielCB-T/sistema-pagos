import { h } from '../core/dom.js';
import { api, query } from '../core/api.js';
import { session } from '../core/session.js';
import { money } from '../core/format.js';
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
          session.can('adeudos:editar')   && boton('✏️ Modificar', 'btn-info',   () => formulario(f)),
          session.can('adeudos:eliminar') && boton('🗑 Eliminar',  'btn-danger', () => eliminar(f)),
        ],
      }));
    } catch (err) {
      swalError('Error al cargar adeudos', err.message);
    }
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
      titulo: adeudo ? `✏️ Modificar adeudo #${adeudo.id_adeudo}` : '📋 Registrar adeudo',
      contenido: f.el,
    });
  }

  async function eliminar(a) {
    const ok = await swalConfirmar({
      titulo: '🗑 Eliminar adeudo',
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

  const buscador = h('input', { type: 'search', placeholder: '🔍 Buscar por habitante o familia', 'aria-label': 'Buscar adeudo' });
  const estado   = h('select', { 'aria-label': 'Filtrar por estado' },
    [['', 'Todos los estados'], ['pendiente', '🔴 Pendientes'], ['parcial', '🟡 Parciales'], ['pagado', '🟢 Pagados']]
      .map(([v, t]) => h('option', { value: v }, t)));

  contenedor.replaceChildren(
    h('h1', {}, '📋 Gestión de Adeudos'),
    h('form', {
      class: 'toolbar no-print',
      onsubmit: (e) => { e.preventDefault(); filtro.q = buscador.value.trim(); filtro.estado = estado.value; cargar(); },
    },
      buscador,
      h('label', { class: 'inline' }, 'Estado:', estado),
      h('button', { type: 'submit', class: 'btn btn-warn' }, '🔍 Buscar'),
      session.can('adeudos:crear') && h('button', { type: 'button', class: 'btn btn-ok', onclick: () => formulario(null) }, '+ Registrar adeudo'),
      h('div', { class: 'toolbar-sep' }),
      h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => window.print() }, '🖨 Imprimir')),
    zona);
  await cargar();
}
