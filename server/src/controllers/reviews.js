'use strict';
const reviewService = require('../services/reviews');
const { parse } = require('../lib/validate');
const { reviewSchema, reviewUpdateSchema } = require('../validators/schemas');

async function create(req, res, next) {
  try {
    const data = parse(reviewSchema, req.body);
    res.status(201).json({ review: await reviewService.create(req.user, req.params.id, data) });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = parse(reviewUpdateSchema, req.body);
    res.json({ review: await reviewService.update(req.user, req.params.id, data) });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try { res.json(await reviewService.remove(req.user, req.params.id)); } catch (err) { next(err); }
}

module.exports = { create, update, remove };
