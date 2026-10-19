import { h } from '../core/dom.js';
import { api } from '../core/api.js';
import { session } from '../core/session.js';
import { crearFormulario } from '../components/form.js';
import { toast } from '../components/toast.js';

export async function render(contenedor) {
  const cfg = await api.get('/configuracion');
  const f = crearFormulario({
    values: cfg,
    fields: [
      { name: 'nombre_comunidad', label: 'Nombre de la comunidad / asamblea', required: true, maxlength: 120 },
      { name: 'localidad', label: 'Localidad, municipio y estado', maxlength: 120 },
      { name: 'leyenda_comprobante', label: 'Leyenda al pie del comprobante', type: 'textarea', maxlength: 200 },
    ],
    onCancel: () => { location.hash = '#/inicio'; },
    onSubmit: async (v) => {
      await api.put('/configuracion', v);
      await session.cargarConfig();
      toast('Configuración guardada');
      location.hash = '#/inicio';
    },
  });
  contenedor.replaceChildren(h('h1', {}, 'Configurar Sistema'), h('div', { class: 'panel' }, f.el));
}
