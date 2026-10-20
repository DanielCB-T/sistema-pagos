// Bloqueo temporal por intentos de inicio de sesión fallidos (por usuario + IP), en memoria.
// Complementa el límite por IP de auth.routes.js. Se reinicia al reiniciar el servidor.
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;
const MAX_REGISTROS = 5000;
const registros = new Map(); // clave -> { n, hasta, expira }

const clave = (usuario, ip) => `${String(usuario).trim().toLowerCase().slice(0, 50)}|${ip}`;

function purgar() {
  const t = Date.now();
  for (const [k, r] of registros) if (r.expira <= t) registros.delete(k);
}
setInterval(purgar, 10 * 60 * 1000).unref();

/** Minutos restantes de bloqueo (0 si puede intentar). */
function minutosBloqueado(usuario, ip) {
  const r = registros.get(clave(usuario, ip));
  if (!r || r.hasta <= Date.now()) return 0;
  return Math.ceil((r.hasta - Date.now()) / 60000);
}

function registrarFallo(usuario, ip) {
  const k = clave(usuario, ip);
  if (!registros.has(k) && registros.size >= MAX_REGISTROS) purgar();
  if (!registros.has(k) && registros.size >= MAX_REGISTROS) return; // protección de memoria
  const r = registros.get(k) || { n: 0, hasta: 0, expira: 0 };
  if (r.expira <= Date.now()) { r.n = 0; r.hasta = 0; }
  r.n += 1;
  r.expira = Date.now() + BLOQUEO_MS;
  if (r.n >= MAX_INTENTOS) r.hasta = Date.now() + BLOQUEO_MS;
  registros.set(k, r);
}

const registrarExito = (usuario, ip) => registros.delete(clave(usuario, ip));

module.exports = { minutosBloqueado, registrarFallo, registrarExito };