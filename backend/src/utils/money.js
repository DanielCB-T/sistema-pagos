// Suma de montos (texto decimal) usando centavos enteros para evitar errores de coma flotante
const aCentavos = (v) => Math.round(Number(v) * 100);
const sumar = (filas, clave) => (filas.reduce((acc, f) => acc + aCentavos(f[clave]), 0) / 100).toFixed(2);
module.exports = { aCentavos, sumar };
