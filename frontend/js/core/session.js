// Estado de sesión del usuario actual (singleton)
import { api } from './api.js';

export const session = {
  user: null,
  config: null,

  can(permiso) {
    return !!this.user && this.user.permisos.includes(permiso);
  },

  async cargar() {
    try {
      this.user = (await api.get('/auth/me')).usuario;
      await this.cargarConfig();
    } catch {
      this.limpiar();
    }
  },

  async cargarConfig() {
    this.config = await api.get('/configuracion').catch(() => null);
  },

  async iniciar(nombre_usuario, contrasena) {
    this.user = (await api.post('/auth/login', { nombre_usuario, contrasena })).usuario;
    await this.cargarConfig();
  },

  async cerrar() {
    await api.post('/auth/logout').catch(() => {});
    this.limpiar();
  },

  limpiar() {
    this.user = null;
    this.config = null;
  },
};
