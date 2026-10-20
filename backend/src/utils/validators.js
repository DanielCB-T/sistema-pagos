// Validadores de entrada. Todos lanzan AppError(400) si el dato es inválido.
const AppError = require('./AppError');

const bad = (msg) => new AppError(400, msg, 'VALIDACION');

function texto(valor, campo, { requerido = false, min = 0, max = 255, patron, mensajePatron } = {}) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    if (requerido) throw bad(`${campo} es obligatorio`);
    return null;
  }
  if (typeof valor !== 'string' && typeof valor !== 'number') throw bad(`${campo} no es válido`);
  const t = String(valor).trim();
  if (t.length < min) throw bad(`${campo} debe tener al menos ${min} caracteres`);
  if (t.length > max) throw bad(`${campo} no debe exceder ${max} caracteres`);
  if (patron && !patron.test(t)) throw bad(mensajePatron || `${campo} no tiene un formato válido`);
  return t;
}

function entero(valor, campo, { requerido = true } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (requerido) throw bad(`${campo} es obligatorio`);
    return null;
  }
  const s = String(valor).trim();
  if (!/^\d{1,9}$/.test(s) || Number(s) < 1) throw bad(`${campo} no es válido`);
  return Number(s);
}

// Devuelve el monto como texto con 2 decimales ("500.00"); positivo, máx 99,999,999.99
function monto(valor, campo = 'Monto') {
  if (valor === undefined || valor === null || String(valor).trim() === '') throw bad(`${campo} es obligatorio`);
  const s = String(valor).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw bad(`${campo} debe ser un número positivo con máximo 2 decimales`);
  const n = Number(s);
  if (n <= 0) throw bad(`${campo} debe ser mayor a cero`);
  if (n > 99999999.99) throw bad(`${campo} excede el máximo permitido`);
  return n.toFixed(2);
}

// Fecha ISO 'YYYY-MM-DD' válida
function fecha(valor, campo, { requerido = false } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (requerido) throw bad(`${campo} es obligatoria`);
    return null;
  }
  const s = String(valor).trim();
  const d = new Date(`${s}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    throw bad(`${campo} no es una fecha válida (AAAA-MM-DD)`);
  }
  return s;
}

function opcion(valor, campo, permitidos, { requerido = true } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (requerido) throw bad(`${campo} es obligatorio`);
    return null;
  }
  if (!permitidos.includes(valor)) throw bad(`${campo} no es válido`);
  return valor;
}

// bcrypt solo procesa 72 bytes; se limita a 72 caracteres
function contrasena(valor, { requerido = true } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (requerido) throw bad('La contraseña es obligatoria');
    return null;
  }
  if (typeof valor !== 'string') throw bad('La contraseña no es válida');
  if (valor.length < 8) throw bad('La contraseña debe tener al menos 8 caracteres');
  if (valor.length > 72) throw bad('La contraseña no debe exceder 72 caracteres');
  if (!/[A-Za-z]/.test(valor) || !/\d/.test(valor)) throw bad('La contraseña debe combinar letras y números');
  return valor;
}

module.exports = { bad, texto, entero, monto, fecha, opcion, contrasena };
