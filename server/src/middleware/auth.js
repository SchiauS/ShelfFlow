'use strict';
const { User } = require('../models');
const { unauthorized, forbidden } = require('../lib/errors');

async function loadUser(req, _res, next) {
  req.user = null;
  const id = req.session && req.session.userId;
  if (!id) return next();
  try {
    const user = await User.findByPk(id);
    if (user && user.isActive) req.user = user;
    else if (req.session) req.session.userId = null;
  } catch (err) {
    return next(err);
  }
  return next();
}

function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized());
  return next();
}

function requireRole(role) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role !== role && req.user.role !== 'ADMIN') return next(forbidden());
    return next();
  };
}

const isAdmin = (user) => Boolean(user && user.role === 'ADMIN');

module.exports = { loadUser, requireAuth, requireRole, isAdmin };
