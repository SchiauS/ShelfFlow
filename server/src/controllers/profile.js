'use strict';
const profileService = require('../services/profile');
const { parse } = require('../lib/validate');
const { profileSchema, noteSchema } = require('../validators/schemas');

async function get(req, res, next) {
  try { res.json({ profile: await profileService.getProfile(req.user) }); } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = parse(profileSchema, req.body);
    res.json({ profile: await profileService.updateProfile(req.user, data) });
  } catch (err) { next(err); }
}

async function listNotes(req, res, next) {
  try { res.json({ items: await profileService.listNotes(req.user.id) }); } catch (err) { next(err); }
}

async function createNote(req, res, next) {
  try {
    const { content } = parse(noteSchema, req.body);
    res.status(201).json({ note: await profileService.createNote(req.user.id, content) });
  } catch (err) { next(err); }
}

async function updateNote(req, res, next) {
  try {
    const { content } = parse(noteSchema, req.body);
    res.json({ note: await profileService.updateNote(req.user.id, req.params.id, content) });
  } catch (err) { next(err); }
}

async function removeNote(req, res, next) {
  try { res.json(await profileService.removeNote(req.user.id, req.params.id)); } catch (err) { next(err); }
}

module.exports = { get, update, listNotes, createNote, updateNote, removeNote };
