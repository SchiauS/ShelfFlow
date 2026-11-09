'use strict';
const openLibrary = require('../services/openlibrary');
const importService = require('../services/import');
const { parse } = require('../lib/validate');
const { importSearchSchema, importCreateSchema } = require('../validators/schemas');
const { AppError } = require('../lib/errors');

async function search(req, res, next) {
  try {
    const { q, field } = parse(importSearchSchema, req.query);
    res.json(await openLibrary.search({ q, field }));
  } catch (err) {
    if (err instanceof AppError) return next(err);
    return next(new AppError(503, 'external_unavailable', 'Catalogul extern este indisponibil momentan.'));
  }
}

async function create(req, res, next) {
  try {
    const data = parse(importCreateSchema, req.body);
    const book = await importService.createFromImport(req.user, data);
    res.status(201).json({ book });
  } catch (err) { next(err); }
}

module.exports = { search, create };
