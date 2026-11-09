'use strict';
const { User } = require('../models');
const { hash, verify } = require('../lib/password');
const { conflict, unauthorized, forbidden } = require('../lib/errors');

const shape = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, createdAt: u.createdAt,
});

async function findByEmail(email) {
  return User.findOne({ where: User.sequelize.where(
    User.sequelize.fn('lower', User.sequelize.col('email')), email.toLowerCase(),
  ) });
}

async function register(data) {
  const existing = await findByEmail(data.email);
  if (existing) throw conflict('Există deja un cont cu acest email.');
  const passwordHash = await hash(data.password);
  const user = await User.create({ name: data.name, email: data.email, passwordHash, role: 'USER' });
  return shape(user);
}

async function login(email, password) {
  const user = await findByEmail(email);
  const ok = await verify(password, user ? user.passwordHash : null);
  if (!user || !ok) throw unauthorized('Email sau parolă incorectă.');
  if (!user.isActive) throw forbidden('Contul este dezactivat.');
  return shape(user);
}

module.exports = { register, login, findByEmail, shape };
