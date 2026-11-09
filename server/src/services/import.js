'use strict';
const { Book } = require('../models');
const { conflict } = require('../lib/errors');
const booksService = require('./books');
const openLibrary = require('./openlibrary');
const { saveCover } = require('./upload');

async function createFromImport(user, data) {
  const duplicate = await booksService.findDuplicate(data);
  if (duplicate) {
    throw conflict('Cartea există deja în catalog.', { bookId: duplicate.id });
  }
  let coverPath = null;
  let description = data.description || null;
  if (!description && data.openLibraryWorkId) {
    description = await openLibrary.getDescription(data.openLibraryWorkId);
  }
  if (data.coverId) {
    try {
      const buffer = await openLibrary.downloadCover(data.coverId);
      coverPath = await saveCover(buffer);
    } catch { coverPath = null; }
  }
  const book = await Book.create({
    createdBy: user.id,
    title: data.title,
    author: data.author,
    isbn: data.isbn || null,
    description,
    publicationYear: data.publicationYear || null,
    publisher: data.publisher || null,
    language: data.language || null,
    totalCopies: data.totalCopies || 1,
    source: 'openlibrary',
    coverPath,
    coverSource: coverPath ? 'upload' : 'none',
    openLibraryWorkId: data.openLibraryWorkId || null,
    openLibraryEditionId: data.openLibraryEditionId || null,
  });
  const { findById } = require('../repositories/books');
  return findById(book.id);
}

module.exports = { createFromImport };
