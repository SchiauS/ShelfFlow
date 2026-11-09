'use strict';
const { unprocessable } = require('./errors');

function parse(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.') || null, message: i.message }));
    throw unprocessable('Date invalide.', details);
  }
  return result.data;
}

module.exports = { parse };
