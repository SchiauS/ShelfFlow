'use strict';
const rateLimit = require('express-rate-limit');
const config = require('../config');

const json = (message) => ({ error: { code: 'rate_limited', message } });

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Prea multe încercări de autentificare. Reîncearcă mai târziu.'),
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Prea multe conturi create de pe această adresă.'),
});

const importLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Prea multe căutări externe. Așteaptă un minut.'),
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Prea multe cereri. Așteaptă un minut.'),
});

const pass = (_req, _res, next) => next();
const isTest = config.env === 'test';

module.exports = isTest
  ? { loginLimiter: pass, registerLimiter: pass, importLimiter: pass, writeLimiter: pass }
  : { loginLimiter, registerLimiter, importLimiter, writeLimiter };
