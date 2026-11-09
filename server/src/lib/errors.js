'use strict';
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
const badRequest = (m, d) => new AppError(400, 'bad_request', m, d);
const unauthorized = (m = 'Autentificare necesară.') => new AppError(401, 'unauthorized', m);
const forbidden = (m = 'Acces interzis.') => new AppError(403, 'forbidden', m);
const notFound = (m = 'Resursa nu există.') => new AppError(404, 'not_found', m);
const conflict = (m, d) => new AppError(409, 'conflict', m, d);
const unprocessable = (m, d) => new AppError(422, 'validation_error', m, d);
module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict, unprocessable };
