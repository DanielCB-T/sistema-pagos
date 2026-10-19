// Error controlado: se responde al cliente con su status y mensaje
class AppError extends Error {
  constructor(statusCode, message, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isAppError = true;
  }
}
module.exports = AppError;
