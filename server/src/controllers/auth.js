'use strict';
const authService = require('../services/auth');
const profileService = require('../services/profile');
const { parse } = require('../lib/validate');
const { registerSchema, loginSchema } = require('../validators/schemas');

const regenerate = (req) => new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
const saveSession = (req) => new Promise((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));

async function register(req, res, next) {
  try {
    const data = parse(registerSchema, req.body);
    const user = await authService.register(data);
    await regenerate(req);
    req.session.userId = user.id;
    req.session.csrfToken = null;
    await saveSession(req);
    res.status(201).json({ user });
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const { email, password } = parse(loginSchema, req.body);
    const user = await authService.login(email, password);
    await regenerate(req);
    req.session.userId = user.id;
    req.session.csrfToken = null;
    await saveSession(req);
    res.json({ user });
  } catch (err) { next(err); }
}

async function logout(req, res, next) {
  try {
    req.session.destroy(() => {
      res.clearCookie('sf.sid', { path: req.app.locals.basePath });
      res.json({ ok: true });
    });
  } catch (err) { next(err); }
}

async function me(req, res) {
  if (!req.user) return res.json({ user: null });
  const profile = await profileService.getProfile(req.user);
  return res.json({ user: profile });
}

module.exports = { register, login, logout, me };
