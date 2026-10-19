// Gestionar roles: modificar el nombre de un rol y asignar rol a usuarios
import { h } from '../core/dom.js';
import { api } from '../core/api.js';
import { session } from '../core/session.js';
import { tablaDatos, boton, insignia } from '../components/table.js';
import { crearFormulario } from '../components/form.js';
import { abrirModal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function render(contenedor) {
  const zonaRoles = h('div');
  const zonaUsuarios = h('div');

  async function cargar() {
    const [roles, usuarios] = await Promise.all([api.get('/roles'), api.get('/usuarios')]);

    zonaRoles.replaceChildren(tablaDatos({
      columns: [
        { label: 'ID', key: 'id_rol' },
        { label: 'Rol', key: 'nombre_rol' },
        { label: 'Usuarios', key: 'total_usuarios' },
      ],
      rows: roles,
      acciones: (r) => [session.can('roles:modificar') && boton('Modificar', 'btn-info', () => renombrar(r))],
    }));

    zonaUsuarios.replaceChildren(tablaDatos({
      columns: [
        { label: 'Usuario', key: 'nombre_usuario' },
        { label: 'Estado', render: (u) => insignia(u.estado) },
        {
          label: 'Rol',
          render: (u) => {
            const yo = u.id_usuario === session.user.id_usuario;
            const sel = h('select', { 'aria-label': `Rol de ${u.nombre_usuario}`, disabled: yo, title: yo ? 'No puede cambiar su propio rol' : undefined },
              roles.map((r) => h('option', { value: r.id_rol, selected: r.id_rol === u.id_rol }, r.nombre_rol)));
            sel.addEventListener('change', async () => {
              try {
                await api.put('/roles/asignar', { id_usuario: u.id_usuario, id_rol: sel.value });
                toast(`Rol de ${u.nombre_usuario} actualizado`);
                await cargar();
              } catch (err) { toast(err.message, 'error'); sel.value = u.id_rol; }
            });
            return sel;
          },
        },
      ],
      rows: usuarios,
    }));
  }

  function renombrar(rol) {
    let modal;
    const f = crearFormulario({
      values: { nombre_rol: rol.nombre_rol },
      fields: [{ name: 'nombre_rol', label: 'Nombre del rol', required: true, maxlength: 50, help: 'Solo cambia el nombre visible; los permisos del rol no se modifican.' }],
      onCancel: () => modal.close(),
      onSubmit: async (v) => {
        await api.put(`/roles/${rol.id_rol}`, v);
        modal.close();
        toast('Rol actualizado');
        await cargar();
      },
    });
    modal = abrirModal({ titulo: 'Modificar rol', contenido: f.el });
  }

  contenedor.replaceChildren(
    h('h1', {}, 'Gestión de Roles'),
    h('h2', {}, 'Roles del sistema'), zonaRoles,
    h('h2', {}, 'Asignar rol a los usuarios'), zonaUsuarios,
    h('p', {}, h('a', { href: '#/inicio', class: 'btn btn-ghost' }, 'Volver al menú principal')));
  await cargar();
}
