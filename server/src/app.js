'use strict';
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const config = require('./config');
const apiRoutes = require('./routes');
const { loadUser } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/error');

function createApp() {
  const app = express();
  app.locals.basePath = config.basePath;
  app.disable('x-powered-by');
  if (config.isProduction) app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://covers.openlibrary.org'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'same-origin' },
  }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  app.use(cookieParser());

  app.use(session({
    name: 'sf.sid',
    secret: config.session.secret,
    store: new PgStore({ conString: config.databaseUrl, createTableIfMissing: true }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.session.secure,
      sameSite: 'lax',
      path: config.basePath,
      maxAge: config.session.ttlHours * 60 * 60 * 1000,
    },
  }));

  app.use(loadUser);

  app.use(`${config.basePath}/api/v1`, apiRoutes);
  app.use(`${config.basePath}/api`, notFoundHandler);
  app.get(`${config.basePath}/healthz`, (_req, res) => res.json({ status: 'ok' }));

  app.use(`${config.basePath}/uploads`, express.static(config.uploads.dir, {
    index: false,
    dotfiles: 'deny',
    maxAge: '30d',
    immutable: true,
    setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'),
  }));

  const clientDir = path.resolve(__dirname, '../../client/dist');
  app.use(config.basePath, express.static(clientDir, { index: false, maxAge: '1h' }));
  app.get(`${config.basePath}/*`, (req, res, next) => {
    if (req.path.includes('/api/')) return next();
    return res.sendFile(path.join(clientDir, 'index.html'), (err) => (err ? next() : undefined));
  });

  app.get('/', (_req, res) => res.redirect(`${config.basePath}/`));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
