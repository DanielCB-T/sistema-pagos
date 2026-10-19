import { h } from '../core/dom.js';
import { session } from '../core/session.js';

export function render(raiz, { alIngresar }) {
  const error = h('div', { class: 'form-error', role: 'alert', hidden: true });
  const usuario = h('input', { id: 'usuario', name: 'usuario', type: 'text', autocomplete: 'username', required: true, maxlength: 50 });
  const clave = h('input', { id: 'clave', name: 'clave', type: 'password', autocomplete: 'current-password', required: true, maxlength: 72 });
  const boton = h('button', { type: 'submit', class: 'btn btn-primary btn-block' }, 'Aceptar');

  const form = h('form', { class: 'login-card', novalidate: true },
    h('img', { src: '/img/logo.svg', alt: '', width: 72, height: 72 }),
    h('h1', {}, 'Iniciar sesión'),
    h('p', { class: 'muted' }, 'Sistema de Gestión de Pagos · Asamblea Comunitaria de San Juan Teponaxtla'),
    h('div', { class: 'field' }, h('label', { for: 'usuario' }, 'Usuario'), usuario),
    h('div', { class: 'field' }, h('label', { for: 'clave' }, 'Contraseña'), clave),
    error, boton);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    if (!usuario.value.trim() || !clave.value) {
      error.textContent = 'Ingrese su usuario y contraseña';
      error.hidden = false;
      return;
    }
    boton.disabled = true;
    try {
      await session.iniciar(usuario.value.trim(), clave.value);
      alIngresar();
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
      clave.value = '';
      clave.focus();
    } finally {
      boton.disabled = false;
    }
  });

  raiz.replaceChildren(h('div', { class: 'login-wrap' }, form));
  usuario.focus();
}
