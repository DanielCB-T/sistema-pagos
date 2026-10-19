import { h } from '../core/dom.js';
import { api, query } from '../core/api.js';
import { session } from '../core/session.js';
import { tablaDatos, boton, insignia } from '../components/table.js';
import { crearFormulario } from '../components/form.js';
import { abrirModal, confirmar } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function render(contenedor) {
  let q = '';
  const zona = h('div');
  const roles = await api.get('/roles');

  async function cargar() {
    const filas = await api.get(`/usuarios${query({ q })}`);
    zona.replaceChildren(tablaDatos({
      columns: [
        { label: 'ID', key: 'id_usuario' },
        { label: 'Usuario', key: 'nombre_usuario' },
        { label: 'Cargo', key: 'nombre_rol' },
        { label: 'Estado', render: (u) => insignia(u.estado) },
      ],
      rows: filas,
      vacio: 'No se encontraron usuarios',
      acciones: (u) => {
        const yo = u.id_usuario === session.user.id_usuario;
        return [
          session.can('usuarios:editar') && boton('Editar', 'btn-info', () => formulario(u)),
          !yo && session.can('usuarios:bloquear') && boton(u.estado === 'activo' ? 'Bloquear' : 'Desbloquear', 'btn-warn', () => cambiarEstado(u)),
          !yo && session.can('usuarios:eliminar') && boton('Eliminar', 'btn-danger', () => eliminar(u)),
        ];
      },
    }));
  }

  function formulario(usuario) {
    const yo = usuario && usuario.id_usuario === session.user.id_usuario;
    let modal;
    const f = crearFormulario({
      values: usuario ? { nombre_usuario: usuario.nombre_usuario, id_rol: usuario.id_rol, estado: usuario.estado } : { estado: 'activo', id_rol: roles[0]?.id_rol },
      fields: [
        { name: 'nombre_usuario', label: 'Usuario', required: true, maxlength: 50 },
        { name: 'contrasena', label: 'Contraseña', type: 'password', required: !usuario, maxlength: 72, help: usuario ? 'Déjela vacía para conservar la actual. Mínimo 8 caracteres.' : 'Mínimo 8 caracteres.' },
        { name: 'id_rol', label: 'Cargo (rol)', type: 'select', required: true, options: roles.map((r) => ({ value: r.id_rol, label: r.nombre_rol })), help: yo ? 'No puede cambiar su propio rol.' : undefined },
        { name: 'estado', label: 'Estado', type: 'select', required: true, options: [{ value: 'activo', label: 'Activo' }, { value: 'bloqueado', label: 'Bloqueado' }] },
      ],
      onCancel: () => modal.close(),
      onSubmit: async (v) => {
        if (usuario) {
          const cuerpo = { ...v };
          if (!cuerpo.contrasena) delete cuerpo.contrasena;
          await api.put(`/usuarios/${usuario.id_usuario}`, cuerpo);
        } else {
          await api.post('/usuarios', v);
        }
        modal.close();
        toast(usuario ? 'Usuario actualizado' : 'Usuario registrado');
        await cargar();
      },
    });
    modal = abrirModal({ titulo: usuario ? 'Modificar usuario' : 'Agregar nuevo usuario', contenido: f.el });
  }

  async function cambiarEstado(u) {
    const nuevo = u.estado === 'activo' ? 'bloqueado' : 'activo';
    try {
      await api.patch(`/usuarios/${u.id_usuario}/estado`, { estado: nuevo });
      toast(nuevo === 'bloqueado' ? 'Usuario bloqueado' : 'Usuario desbloqueado');
      await cargar();
    } catch (err) { toast(err.message, 'error'); }
  }

  async function eliminar(u) {
    if (!(await confirmar({ titulo: 'Eliminar usuario', mensaje: `¿Eliminar al usuario "${u.nombre_usuario}"?`, textoOk: 'Eliminar', peligro: true }))) return;
    try {
      await api.del(`/usuarios/${u.id_usuario}`);
      toast('Usuario eliminado');
      await cargar();
    } catch (err) { toast(err.message, 'error'); }
  }

  const buscador = h('input', { type: 'search', placeholder: 'Buscar por usuario o cargo', 'aria-label': 'Buscar usuario' });
  contenedor.replaceChildren(
    h('h1', {}, 'Gestión de Usuarios'),
    h('form', { class: 'toolbar no-print', onsubmit: (e) => { e.preventDefault(); q = buscador.value.trim(); cargar(); } },
      buscador,
      h('button', { type: 'submit', class: 'btn btn-warn' }, 'Buscar'),
      session.can('usuarios:crear') && h('button', { type: 'button', class: 'btn btn-ok', onclick: () => formulario(null) }, 'Agregar usuario'),
      h('button', { type: 'button', class: 'btn btn-warn', onclick: () => window.print() }, 'Imprimir lista'),
      h('a', { href: '#/inicio', class: 'btn btn-ghost' }, 'Volver al menú principal')),
    zona);
  await cargar();
}
