'use strict';
const { PrivateNote } = require('../models');
const { notFound, forbidden } = require('../lib/errors');

const noteShape = (n) => ({ id: n.id, content: n.content, createdAt: n.createdAt, updatedAt: n.updatedAt });

async function getProfile(user) {
  const notes = await PrivateNote.findAll({ where: { userId: user.id }, order: [['createdAt', 'DESC']] });
  return {
    id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, createdAt: user.createdAt,
    notes: notes.map(noteShape),
  };
}

async function updateProfile(user, data) {
  if (data.name !== undefined) user.name = data.name;
  if (data.phone !== undefined) user.phone = data.phone;
  await user.save();
  return getProfile(user);
}

async function listNotes(userId) {
  const notes = await PrivateNote.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
  return notes.map(noteShape);
}

async function createNote(userId, content) {
  const note = await PrivateNote.create({ userId, content });
  return noteShape(note);
}

async function updateNote(userId, id, content) {
  const note = await PrivateNote.findOne({ where: { id, userId } });
  if (!note) throw notFound('Notița nu există.');
  note.content = content;
  await note.save();
  return noteShape(note);
}

async function removeNote(userId, id) {
  const note = await PrivateNote.findOne({ where: { id, userId } });
  if (!note) throw notFound('Notița nu există.');
  await note.destroy();
  return { deleted: true, id };
}

module.exports = { getProfile, updateProfile, listNotes, createNote, updateNote, removeNote };
