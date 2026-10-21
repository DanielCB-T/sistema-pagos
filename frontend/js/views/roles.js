// Gestionar roles: modificar el nombre de un rol y asignar rol a usuarios
import { h } from '../core/dom.js';
import { api } from '../core/api.js';
import { session } from '../core/session.js';
import { tablaDatos, boton, insignia } from '../components/table.js';
import { crearFormulario } from '../components/form.js';
import { abrirModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { swalOk, swalError, swalWarn } from '../core/swal.js';

export async function render(contenedor) {
  const zonaRoles    = h('div');
  const zonaUsuarios = h('div');

  async function cargar() {
    try {
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
              const sel = h('select', {
                'aria-label': `Rol de ${u.nombre_usuario}`,
                disabled: yo,
                title: yo ? 'No puede cambiar su propio rol' : undefined,
              },
              roles.map((r) => h('option', { value: r.id_rol, selected: r.id_rol === u.id_rol }, r.nombre_rol)));
              sel.addEventListener('change', async () => {
                try {
                  await api.put('/roles/asignar', { id_usuario: u.id_usuario, id_rol: sel.value });
                  toast(`Rol de ${u.nombre_usuario} actualizado`);
                  await swalOk('¡Rol actualizado!', `El rol de "${u.nombre_usuario}" fue cambiado correctamente.`);
                  await cargar();
                } catch (err) {
                  toast(err.message, 'error');
                  swalError('Error al cambiar rol', err.message);
                  sel.value = u.id_rol;
                }
              });
              return sel;
            },
          },
        ],
        rows: usuarios,
      }));
    } catch (err) {
      swalError('Error al cargar roles', err.message);
    }
  }

  function renombrar(rol) {
    let modal;
    const f = crearFormulario({
      values: { nombre_rol: rol.nombre_rol },
      fields: [{
        name: 'nombre_rol', label: 'Nombre del rol', required: true, maxlength: 50,
        help: 'Solo cambia el nombre visible; los permisos del rol no se modifican.',
      }],
      onCancel: () => modal.close(),
      onSubmit: async (v) => {
        await api.put(`/roles/${rol.id_rol}`, v);
        modal.close();
        toast('Rol actualizado');
        await swalOk('¡Rol actualizado!', `El rol fue renombrado a "${v.nombre_rol}".`);
        await cargar();
      },
    });
    modal = abrirModal({ titulo: 'Modificar rol', contenido: f.el });
  }

  contenedor.replaceChildren(
    h('h1', {}, 'Gestión de Roles'),
    h('div', { class: 'toolbar no-print', style: 'margin-bottom:1.25rem;' },
      h('p', { class: 'muted', style: 'margin:0;flex:1' }, 'Administra los roles del sistema y asigna cargos a los usuarios.'),
    ),
    h('h2', {}, 'Roles del sistema'), zonaRoles,
    h('h2', {}, 'Asignar rol a los usuarios'), zonaUsuarios);
  await cargar();
}
