/**
 * swal.js — Utilidades de SweetAlert2 para el sistema
 * Envuelve las llamadas a Swal con estilos consistentes.
 */

const colores = {
  ok:      '#1a8a4c',
  peligro: '#c0261e',
  warn:    '#c9770f',
  info:    '#2f6db5',
};

/**
 * Alerta de éxito
 * @param {string} titulo
 * @param {string} [texto]
 */
export function swalOk(titulo, texto = '') {
  return Swal.fire({
    icon: 'success',
    title: titulo,
    text: texto || undefined,
    confirmButtonColor: colores.ok,
    timer: texto ? undefined : 2000,
    timerProgressBar: !texto,
  });
}

/**
 * Alerta de error
 * @param {string} titulo
 * @param {string} [texto]
 */
export function swalError(titulo, texto = '') {
  return Swal.fire({
    icon: 'error',
    title: titulo,
    text: texto || undefined,
    confirmButtonColor: colores.peligro,
  });
}

/**
 * Alerta de advertencia
 * @param {string} titulo
 * @param {string} [texto]
 */
export function swalWarn(titulo, texto = '') {
  return Swal.fire({
    icon: 'warning',
    title: titulo,
    text: texto || undefined,
    confirmButtonColor: colores.warn,
  });
}

/**
 * Alerta de información
 * @param {string} titulo
 * @param {string} [texto]
 */
export function swalInfo(titulo, texto = '') {
  return Swal.fire({
    icon: 'info',
    title: titulo,
    text: texto || undefined,
    confirmButtonColor: colores.info,
  });
}

/**
 * Diálogo de confirmación con SweetAlert2
 * @param {object} opts
 * @param {string} opts.titulo
 * @param {string} opts.mensaje
 * @param {string} [opts.textoOk='Confirmar']
 * @param {string} [opts.textoCancelar='Cancelar']
 * @param {boolean} [opts.peligro=false]
 * @returns {Promise<boolean>}
 */
export async function swalConfirmar({ titulo, mensaje, textoOk = 'Confirmar', textoCancelar = 'Cancelar', peligro = false }) {
  const result = await Swal.fire({
    icon: peligro ? 'warning' : 'question',
    title: titulo,
    text: mensaje,
    showCancelButton: true,
    confirmButtonText: textoOk,
    cancelButtonText: textoCancelar,
    confirmButtonColor: peligro ? colores.peligro : colores.ok,
    cancelButtonColor: '#6b7266',
    focusCancel: peligro,
  });
  return result.isConfirmed;
}
