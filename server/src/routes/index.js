'use strict';
const express = require('express');
const { z } = require('zod');
const auth = require('../controllers/auth');
const books = require('../controllers/books');
const loans = require('../controllers/loans');
const reviews = require('../controllers/reviews');
const profile = require('../controllers/profile');
const importCtl = require('../controllers/import');
const admin = require('../controllers/admin');
const { requireAuth, requireRole } = require('../middleware/auth');
const { csrfProtect, issue } = require('../middleware/csrf');
const { loginLimiter, registerLimiter, importLimiter } = require('../middleware/rateLimit');
const { badRequest } = require('../lib/errors');
const { singleCover } = require('../services/upload');

const router = express.Router();
const uuid = z.string().uuid();

const uuidParam = (name = 'id') => (req, _res, next) => {
  const parsed = uuid.safeParse(req.params[name]);
  if (!parsed.success) return next(badRequest('Identificator invalid.'));
  return next();
};

router.get('/healthz', (_req, res) => res.json({ status: 'ok', uptime: Math.round(process.uptime()) }));
router.get('/csrf', (req, res) => res.json({ csrfToken: issue(req) }));

router.use(csrfProtect);

// --- auth ---
router.post('/auth/register', registerLimiter, auth.register);
router.post('/auth/login', loginLimiter, auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', auth.me);

// --- catalog (public read) ---
router.get('/books', books.list);
router.get('/categories', books.categories);
router.get('/books/:id', uuidParam(), books.detail);
router.get('/books/:id/reviews', uuidParam(), books.reviews);

// --- catalog (authenticated write) ---
router.post('/books', requireAuth, books.create);
router.patch('/books/:id', requireAuth, uuidParam(), books.update);
router.delete('/books/:id', requireAuth, uuidParam(), books.remove);
router.post('/books/:id/cover', requireAuth, uuidParam(), singleCover, books.uploadCover);

// --- reviews ---
router.post('/books/:id/reviews', requireAuth, uuidParam(), reviews.create);
router.patch('/reviews/:id', requireAuth, uuidParam(), reviews.update);
router.delete('/reviews/:id', requireAuth, uuidParam(), reviews.remove);

// --- loans ---
router.get('/loans/me', requireAuth, loans.mine);
router.post('/loans', requireAuth, loans.create);
router.post('/loans/:id/return', requireAuth, uuidParam(), loans.returnLoan);

// --- open library import ---
router.get('/import/search', requireAuth, importLimiter, importCtl.search);
router.post('/import/books', requireAuth, importCtl.create);

// --- profile & private notes ---
router.get('/profile', requireAuth, profile.get);
router.patch('/profile', requireAuth, profile.update);
router.get('/profile/notes', requireAuth, profile.listNotes);
router.post('/profile/notes', requireAuth, profile.createNote);
router.patch('/profile/notes/:id', requireAuth, uuidParam(), profile.updateNote);
router.delete('/profile/notes/:id', requireAuth, uuidParam(), profile.removeNote);

// --- admin ---
const adminOnly = [requireAuth, requireRole('ADMIN')];
router.get('/admin/users', ...adminOnly, admin.users);
router.patch('/admin/users/:id', ...adminOnly, uuidParam(), admin.updateUser);
router.get('/admin/loans', ...adminOnly, admin.loans);
router.get('/admin/stats', ...adminOnly, admin.stats);
router.get('/admin/audit', ...adminOnly, admin.audit);

module.exports = router;
