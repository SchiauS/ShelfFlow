'use strict';
const crypto = require('node:crypto');
const { forbidden } = require('../lib/errors');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function issue(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Session-bound double-submit: the token must match the one issued for this session. */
function csrfProtect(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const expected = req.session && req.session.csrfToken;
  const provided = req.get('x-csrf-token');
  if (!expected || !provided || !safeEqual(expected, provided)) {
    return next(forbidden('Token CSRF lipsă sau invalid.'));
  }
  return next();
}

module.exports = { csrfProtect, issue };
