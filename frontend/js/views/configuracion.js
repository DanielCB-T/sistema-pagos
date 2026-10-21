import { h } from '../core/dom.js';
import { api } from '../core/api.js';
import { session } from '../core/session.js';
import { crearFormulario } from '../components/form.js';
import { toast } from '../components/toast.js';
import { swalOk, swalError } from '../core/swal.js';

export async function render(contenedor) {
  const cfg = await api.get('/configuracion');
  const f = crearFormulario({
    values: cfg,
    fields: [
      { name: 'nombre_comunidad',    label: 'Nombre de la comunidad / asamblea', required: true, maxlength: 120,
        placeholder: 'Ej: Asamblea Comunitaria de San Juan Teponaxtla' },
      { name: 'localidad',           label: 'Localidad, municipio y estado', maxlength: 120,
        placeholder: 'Ej: San Juan Teponaxtla, Coixtlahuaca, Oaxaca' },
      { name: 'leyenda_comprobante', label: 'Leyenda al pie del comprobante', type: 'textarea', maxlength: 200,
        placeholder: 'Texto que aparecerá al pie de los comprobantes de pago' },
    ],
    onCancel: () => { location.hash = '#/inicio'; },
    onSubmit: async (v) => {
      await api.put('/configuracion', v);
      await session.cargarConfig();
      toast('Configuración guardada');
      await swalOk('¡Configuración guardada!', 'Los datos del sistema fueron actualizados correctamente.');
      location.hash = '#/inicio';
    },
  });
  contenedor.replaceChildren(
    h('h1', {}, '⚙️ Configurar Sistema'),
    h('p', { class: 'muted' }, 'Administra los datos de la comunidad que aparecen en el sistema y en los comprobantes de pago.'),
    h('div', { class: 'panel', style: 'margin-top:1rem' }, f.el));
}
