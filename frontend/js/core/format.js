// Formato de montos, fechas y folios
const fmtMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export const money = (n) => (n === null || n === undefined || n === '' ? '—' : fmtMoneda.format(Number(n)));

// '2026-04-22' -> '22/04/2026' (sin pasar por Date para evitar desfases de zona horaria)
export const fecha = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const folio = (id) => String(id).padStart(6, '0');

export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const fechaHoraLarga = () =>
  new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
