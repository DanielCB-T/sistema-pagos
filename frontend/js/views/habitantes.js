import { h } from '../core/dom.js';
import { api, query } from '../core/api.js';
import { session } from '../core/session.js';
import { tablaDatos, boton } from '../components/table.js';
import { crearFormulario } from '../components/form.js';
import { abrirModal, confirmar } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function render(contenedor) {
  let q = '';
  const zona = h('div');

  async function cargar() {
    const filas = await api.get(`/habitantes${query({ q })}`);
    zona.replaceChildren(tablaDatos({
      columns: [
        { label: 'ID', key: 'id_habitante' },
        { label: 'Núm. familia', key: 'numero_familia' },
        { label: 'Nombre', key: 'nombre_completo' },
        { label: 'Dirección', key: 'direccion' },
        { label: 'Teléfono', key: 'telefono' },
      ],
      rows: filas,
      vacio: 'No se encontraron habitantes',
      acciones: (f) => [
        session.can('habitantes:editar') && boton('Editar', 'btn-info', () => formulario(f)),
        session.can('habitantes:eliminar') && boton('Eliminar', 'btn-danger', () => eliminar(f)),
      ],
    }));
  }

  function formulario(hab) {
    let modal;
    const f = crearFormulario({
      values: hab || {},
      fields: [
        { name: 'numero_familia', label: 'Número de familia', maxlength: 20 },
        { name: 'nombre_completo', label: 'Nombre completo', required: true, maxlength: 100 },
        { name: 'direccion', label: 'Dirección', type: 'textarea', maxlength: 500 },
        { name: 'telefono', label: 'Teléfono', maxlength: 15, type: 'tel' },
      ],
      onCancel: () => modal.close(),
      onSubmit: async (v) => {
        if (hab) await api.put(`/habitantes/${hab.id_habitante}`, v);
        else await api.post('/habitantes', v);
        modal.close();
        toast(hab ? 'Habitante actualizado' : 'Habitante registrado');
        await cargar();
      },
    });
    modal = abrirModal({ titulo: hab ? 'Modificar habitante' : 'Agregar nuevo habitante', contenido: f.el });
  }

  async function eliminar(hab) {
    if (!(await confirmar({ titulo: 'Eliminar habitante', mensaje: `¿Eliminar a "${hab.nombre_completo}"?`, textoOk: 'Eliminar', peligro: true }))) return;
    try {
      await api.del(`/habitantes/${hab.id_habitante}`);
      toast('Habitante eliminado');
      await cargar();
    } catch (err) { toast(err.message, 'error'); }
  }

  const buscador = h('input', { type: 'search', placeholder: 'Buscar por nombre, familia, teléfono o dirección', 'aria-label': 'Buscar habitante' });
  contenedor.replaceChildren(
    h('h1', {}, 'Gestión de Habitantes'),
    h('form', { class: 'toolbar no-print', onsubmit: (e) => { e.preventDefault(); q = buscador.value.trim(); cargar(); } },
      buscador,
      h('button', { type: 'submit', class: 'btn btn-warn' }, 'Buscar'),
      session.can('habitantes:crear') && h('button', { type: 'button', class: 'btn btn-ok', onclick: () => formulario(null) }, 'Agregar habitante'),
      h('button', { type: 'button', class: 'btn btn-warn', onclick: () => window.print() }, 'Imprimir lista'),
      h('a', { href: '#/inicio', class: 'btn btn-ghost' }, 'Volver al menú principal')),
    zona);
  await cargar();
}
