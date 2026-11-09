'use strict';
const config = require('../config');

function notFoundHandler(_req, res) {
  res.status(404).json({ error: { code: 'not_found', message: 'Ruta nu există.' } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const payload = {
    error: {
      code: err.code || 'internal_error',
      message: status >= 500 && config.isProduction ? 'Eroare internă.' : err.message,
    },
  };
  if (err.details) payload.error.details = err.details;
  if (status >= 500) {
    console.error(JSON.stringify({ level: 'error', path: req.originalUrl, method: req.method, message: err.message }));
  }
  res.status(status).json(payload);
}

module.exports = { notFoundHandler, errorHandler };
