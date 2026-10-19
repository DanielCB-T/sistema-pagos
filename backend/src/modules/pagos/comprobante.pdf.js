// Generación del comprobante (voucher) de pago en PDF con PDFKit
const PDFDocument = require('pdfkit');

const moneda = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n));
const fechaLarga = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/** Escribe el PDF del comprobante en `stream` (p. ej. la respuesta HTTP). */
function generarComprobante(pago, config, stream) {
  const doc = new PDFDocument({ size: 'A5', margin: 40, info: { Title: `Comprobante ${pago.id_pago}` } });
  doc.pipe(stream);
  const folio = String(pago.id_pago).padStart(6, '0');
  const ancho = doc.page.width - 80;

  doc.font('Helvetica-Bold').fontSize(13).text(config.nombre_comunidad, { align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor('#555').text(config.localidad, { align: 'center' });
  doc.moveDown(0.8).fillColor('#000').font('Helvetica-Bold').fontSize(15).text('COMPROBANTE DE PAGO', { align: 'center' });
  doc.font('Helvetica').fontSize(10).fillColor('#b5462f').text(`Folio: ${folio}`, { align: 'center' });
  doc.moveDown(0.6);
  doc.moveTo(40, doc.y).lineTo(40 + ancho, doc.y).strokeColor('#999').stroke();
  doc.moveDown(0.8).fillColor('#000');

  const fila = (etiqueta, valor) => {
    doc.font('Helvetica-Bold').fontSize(10).text(`${etiqueta}: `, { continued: true });
    doc.font('Helvetica').text(valor || '—');
    doc.moveDown(0.3);
  };
  fila('Fecha', fechaLarga(pago.fecha));
  fila('Habitante', pago.nombre_completo);
  fila('No. de familia', pago.numero_familia);
  fila('Concepto', pago.concepto);
  if (pago.observaciones) fila('Observaciones', pago.observaciones);
  if (pago.saldo_adeudo !== null) fila('Saldo pendiente del adeudo', moneda(pago.saldo_adeudo));
  fila('Registrado por', pago.registrado_por);

  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(18).text(`Monto pagado: ${moneda(pago.monto)}`, { align: 'center' });

  doc.moveDown(2.5);
  doc.moveTo(120, doc.y).lineTo(doc.page.width - 120, doc.y).strokeColor('#000').stroke();
  doc.font('Helvetica').fontSize(9).text('Firma / sello de quien recibe', { align: 'center' });
  if (config.leyenda_comprobante) {
    doc.moveDown(1.2).fontSize(8).fillColor('#555').text(config.leyenda_comprobante, { align: 'center' });
  }
  doc.end();
}

module.exports = { generarComprobante };
