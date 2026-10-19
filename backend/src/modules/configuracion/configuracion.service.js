// Configuración del sistema (caso de uso "Configurar sistema").
// No hay tabla en el modelo relacional, por lo que se guarda en backend/data/configuracion.json
const fs = require('fs');
const path = require('path');
const v = require('../../utils/validators');

const DIR = path.join(__dirname, '..', '..', '..', 'data');
const ARCHIVO = path.join(DIR, 'configuracion.json');

const POR_DEFECTO = {
  nombre_comunidad: 'Asamblea Comunitaria de San Juan Teponaxtla',
  localidad: 'Putla Villa de Guerrero, Oaxaca',
  leyenda_comprobante: 'Este comprobante ampara el pago registrado en el sistema de la asamblea comunitaria.',
};

function obtener() {
  try {
    return { ...POR_DEFECTO, ...JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')) };
  } catch {
    return { ...POR_DEFECTO };
  }
}

function actualizar(body) {
  const nueva = {
    nombre_comunidad: v.texto(body.nombre_comunidad, 'El nombre de la comunidad', { requerido: true, max: 120 }),
    localidad: v.texto(body.localidad, 'La localidad', { max: 120 }) || '',
    leyenda_comprobante: v.texto(body.leyenda_comprobante, 'La leyenda del comprobante', { max: 200 }) || '',
  };
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = `${ARCHIVO}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(nueva, null, 2));
  fs.renameSync(tmp, ARCHIVO); // escritura atómica
  return nueva;
}

module.exports = { obtener, actualizar };
