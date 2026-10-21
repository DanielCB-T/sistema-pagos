import { h } from '../core/dom.js';
import { session } from '../core/session.js';

export function render(raiz, { alIngresar }) {
  const error = h('div', { class: 'form-error', role: 'alert', hidden: true });
  const usuario = h('input', { id: 'usuario', name: 'usuario', type: 'text', autocomplete: 'username', required: true, maxlength: 50, placeholder: 'Tu nombre de usuario' });
  const clave = h('input', { id: 'clave', name: 'clave', type: 'password', autocomplete: 'current-password', required: true, maxlength: 72, placeholder: '••••••••' });
  const boton = h('button', { type: 'submit', class: 'btn btn-primary btn-block' }, 'Iniciar sesión');

  const form = h('form', { class: 'login-card', novalidate: true },
    h('div', { class: 'login-logo-wrap' },
      h('img', { src: '/img/logo.svg', alt: 'Logo de la asamblea' }),
      h('h1', {}, 'Asamblea Comunitaria'),
      h('span', { class: 'login-badge' }, 'San Juan Teponaxtla')),
    h('p', { class: 'login-subtitle' }, 'Sistema de Gestión de Pagos Comunitarios · Acceso autorizado'),
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
    boton.textContent = 'Iniciando sesión…';
    try {
      await session.iniciar(usuario.value.trim(), clave.value);
      alIngresar();
    } catch (err) {
      // SweetAlert2 para errores de login
      if (window.Swal) {
        Swal.fire({
          icon: 'error',
          title: 'Error al iniciar sesión',
          text: err.message,
          confirmButtonColor: '#c0542e',
        });
      } else {
        error.textContent = err.message;
        error.hidden = false;
      }
      clave.value = '';
      clave.focus();
    } finally {
      boton.disabled = false;
      boton.textContent = 'Iniciar sesión';
    }
  });

  raiz.replaceChildren(h('div', { class: 'login-wrap' }, form));
  usuario.focus();
}
