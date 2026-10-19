// Serialización a CSV (compatible con Excel: BOM UTF-8 + CRLF)
// Se neutralizan celdas que inician con = + - @ (inyección de fórmulas en hojas de cálculo)
function celda(valor, tipo) {
  if (valor === null || valor === undefined) return '';
  let s = String(valor);
  if (tipo !== 'moneda' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function aCSV(columnas, filas) {
  const encabezado = columnas.map((c) => celda(c.label)).join(',');
  const cuerpo = filas.map((f) => columnas.map((c) => celda(f[c.key], c.tipo)).join(','));
  return `\ufeff${[encabezado, ...cuerpo].join('\r\n')}\r\n`;
}

module.exports = { aCSV };
