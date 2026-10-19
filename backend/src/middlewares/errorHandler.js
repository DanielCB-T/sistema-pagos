// Manejo centralizado de errores: respuesta JSON { error: { message, code } }
const AppError = require('../utils/AppError');

const notFound = (req, res, next) => next(new AppError(404, 'Ruta no encontrada', 'NOT_FOUND'));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = 500;
  let message = 'Error interno del servidor';
  let code = 'INTERNAL';

  if (err instanceof AppError) {
    ({ statusCode: status, message, code } = err);
  } else if (err.type === 'entity.parse.failed') {
    status = 400; message = 'El cuerpo de la petición no es un JSON válido'; code = 'JSON';
  } else if (err.code === '23505') { // unique_violation
    status = 409; code = 'DUPLICADO';
    message = String(err.constraint || '').includes('nombre_usuario') ? 'El nombre de usuario ya existe'
      : String(err.constraint || '').includes('nombre_rol') ? 'Ya existe un rol con ese nombre'
      : 'Ya existe un registro con esos datos';
  } else if (err.code === '23503') { // foreign_key_violation
    status = 409; code = 'RELACIONADO';
    message = 'La operación no es posible porque el registro está relacionado con otros datos';
  } else if (err.code === '22P02' || err.code === '22003') { // texto/número inválido
    status = 400; code = 'VALIDACION'; message = 'Uno de los datos enviados no es válido';
  }

  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: { message, code } });
};

module.exports = { notFound, errorHandler };
