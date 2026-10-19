import { h } from '../core/dom.js';

/**
 * Formulario genérico con los botones Guardar / Limpiar / Cancelar (como en las interfaces del protocolo).
 *
 * fields: [{ name, label, type ('text'|'password'|'number'|'date'|'select'|'textarea'),
 *            options:[{value,label}], required, maxlength, help, placeholder, datalist:[...],
 *            onChange:(valor, formApi)=>void, step, min }]
 * onSubmit(valores) debe devolver una promesa; si lanza un error se muestra dentro del formulario.
 * Devuelve { el, setOptions(name, options), setValue(name, valor), getValues() }
 */
export function crearFormulario({ fields, values = {}, onSubmit, onCancel, textoGuardar = 'Guardar' }) {
  const inputs = {};
  const aviso = h('div', { class: 'form-error', role: 'alert', hidden: true });
  const form = h('form', { class: 'form', novalidate: true });

  function llenarOpciones(select, opciones, valor) {
    select.replaceChildren(...opciones.map((o) => h('option', { value: o.value }, o.label)));
    select.value = valor ?? '';
    if (select.value !== String(valor ?? '')) select.selectedIndex = 0;
  }

  for (const f of fields) {
    const id = `campo-${f.name}`;
    const comun = { id, name: f.name, maxlength: f.maxlength, placeholder: f.placeholder, 'aria-required': f.required ? 'true' : undefined };
    let input;
    if (f.type === 'select') {
      input = h('select', comun);
      llenarOpciones(input, f.options || [], values[f.name]);
    } else if (f.type === 'textarea') {
      input = h('textarea', { ...comun, rows: 3, value: values[f.name] ?? '' });
    } else {
      input = h('input', {
        ...comun, type: f.type || 'text', step: f.step, min: f.min, value: values[f.name] ?? '',
        autocomplete: f.type === 'password' ? 'new-password' : 'off',
        list: f.datalist ? `${id}-lista` : undefined,
      });
    }
    if (f.onChange) input.addEventListener('change', () => f.onChange(input.value, api));
    inputs[f.name] = input;
    form.append(h('div', { class: 'field' },
      h('label', { for: id }, f.label, f.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
      input,
      f.datalist ? h('datalist', { id: `${id}-lista` }, f.datalist.map((d) => h('option', { value: d }))) : null,
      f.help ? h('small', { class: 'help' }, f.help) : null));
  }

  const getValues = () => Object.fromEntries(fields.map((f) => [f.name, f.type === 'password' ? inputs[f.name].value : inputs[f.name].value.trim()]));

  const api = {
    el: form,
    getValues,
    setValue: (n, v) => { inputs[n].value = v ?? ''; },
    setOptions: (n, opciones) => llenarOpciones(inputs[n], opciones, ''),
  };

  const mostrarError = (msg) => { aviso.textContent = msg; aviso.hidden = false; };

  const bGuardar = h('button', { type: 'submit', class: 'btn btn-ok' }, textoGuardar);
  const bLimpiar = h('button', { type: 'button', class: 'btn btn-info', onclick: () => {
    aviso.hidden = true;
    for (const f of fields) inputs[f.name].value = values[f.name] ?? '';
  } }, 'Limpiar');
  const bCancelar = h('button', { type: 'button', class: 'btn btn-danger', onclick: () => onCancel && onCancel() }, 'Cancelar');
  form.append(aviso, h('div', { class: 'form-actions' }, bGuardar, bLimpiar, bCancelar));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    aviso.hidden = true;
    const valores = getValues();
    const falta = fields.find((f) => f.required && !valores[f.name]);
    if (falta) { mostrarError(`${falta.label} es obligatorio`); inputs[falta.name].focus(); return; }
    bGuardar.disabled = true;
    try {
      await onSubmit(valores);
    } catch (err) {
      mostrarError(err.message || 'No se pudo guardar');
    } finally {
      bGuardar.disabled = false;
    }
  });

  return api;
}
