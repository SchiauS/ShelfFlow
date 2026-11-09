'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const multer = require('multer');
const sharp = require('sharp');
const config = require('../config');
const { unprocessable } = require('../lib/errors');

const ALLOWED = new Set(['jpeg', 'png', 'webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxBytes, files: 1, fields: 5 },
});

function singleCover(req, res, next) {
  upload.single('cover')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(unprocessable('Fișierul depășește limita de 2 MB.'));
      return next(unprocessable('Încărcare invalidă.'));
    }
    return next(err);
  });
}

/** Re-encodes the image: proves the real format, strips metadata, normalises dimensions. */
async function saveCover(buffer) {
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw unprocessable('Fișierul nu este o imagine validă.');
  }
  if (!ALLOWED.has(meta.format)) throw unprocessable('Sunt acceptate doar imagini JPEG, PNG sau WebP.');
  if ((meta.width || 0) > 12000 || (meta.height || 0) > 12000) throw unprocessable('Imaginea este prea mare.');
  const name = `${crypto.randomUUID()}.webp`;
  await fs.mkdir(config.uploads.dir, { recursive: true });
  await sharp(buffer)
    .rotate()
    .resize({ width: 800, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(path.join(config.uploads.dir, name));
  return name;
}

async function removeCover(name) {
  if (!name || name.includes('/') || name.includes('..')) return;
  await fs.unlink(path.join(config.uploads.dir, name)).catch(() => {});
}

module.exports = { singleCover, saveCover, removeCover };
