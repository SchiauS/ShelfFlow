'use strict';
const { z } = require('zod');

const email = z.string().trim().toLowerCase().email('Email invalid.').max(255);
const password = z.string().min(10, 'Parola trebuie să aibă minim 10 caractere.').max(128);
const name = z.string().trim().min(2).max(120);
const isbn = z.string().trim().regex(/^(?:\d{9}[\dXx]|\d{13})$/, 'ISBN invalid.').optional().nullable();
const short = (max) => z.string().trim().max(max).optional().nullable();

const registerSchema = z.object({
  name,
  email,
  password,
}).strict();

const loginSchema = z.object({ email, password: z.string().min(1).max(128) }).strict();

const bookCreateSchema = z.object({
  title: z.string().trim().min(1, 'Titlul este obligatoriu.').max(300),
  author: z.string().trim().min(1, 'Autorul este obligatoriu.').max(200),
  isbn,
  description: z.string().trim().max(5000).optional().nullable(),
  publicationYear: z.coerce.number().int().min(1000).max(2100).optional().nullable(),
  publisher: short(200),
  language: short(40),
  totalCopies: z.coerce.number().int().min(1).max(1000).default(1),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  coverSource: z.enum(['none', 'upload', 'openlibrary']).optional().default('none'),
  source: z.enum(['manual', 'openlibrary']).optional().default('manual'),
  openLibraryWorkId: z.string().trim().regex(/^OL\d+W$/).optional().nullable(),
  openLibraryEditionId: z.string().trim().regex(/^OL\d+M$/).optional().nullable(),
}).strict();

const bookUpdateSchema = bookCreateSchema.partial().strict();

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  content: z.string().trim().min(1, 'Recenzia nu poate fi goală.').max(2000),
}).strict();

const reviewUpdateSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  content: z.string().trim().min(1).max(2000).optional(),
}).strict().refine((v) => Object.keys(v).length > 0, { message: 'Nicio modificare trimisă.' });

const noteSchema = z.object({ content: z.string().trim().min(1).max(4000) }).strict();

const profileSchema = z.object({
  name: name.optional(),
  phone: z.string().trim().regex(/^[0-9+()\-\s]{6,32}$/, 'Telefon invalid.').optional().nullable(),
}).strict().refine((v) => Object.keys(v).length > 0, { message: 'Nicio modificare trimisă.' });

const adminUserSchema = z.object({
  role: z.enum(['USER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((v) => Object.keys(v).length > 0, { message: 'Nicio modificare trimisă.' });

const loanSchema = z.object({ bookId: z.string().uuid('Identificator carte invalid.') }).strict();

const importSearchSchema = z.object({
  q: z.string().trim().min(2, 'Caută minim 2 caractere.').max(120),
  field: z.enum(['any', 'title', 'author', 'isbn']).default('any'),
});

const importCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().min(1).max(200),
  isbn,
  description: z.string().trim().max(5000).optional().nullable(),
  publicationYear: z.coerce.number().int().min(1000).max(2100).optional().nullable(),
  publisher: short(200),
  language: short(40),
  coverUrl: z.string().url().max(500).optional().nullable(),
  openLibraryWorkId: z.string().trim().regex(/^OL\d+W$/).optional().nullable(),
  openLibraryEditionId: z.string().trim().regex(/^OL\d+M$/).optional().nullable(),
  totalCopies: z.coerce.number().int().min(1).max(1000).default(1),
}).strict();

const listBooksSchema = z.object({
  q: z.string().trim().max(120).optional(),
  title: z.string().trim().max(120).optional(),
  author: z.string().trim().max(120).optional(),
  isbn: z.string().trim().max(20).optional(),
  category: z.string().trim().max(80).optional(),
  available: z.enum(['true', 'false']).optional(),
  sort: z.enum(['title', 'author', 'created_at', 'newest']).default('newest'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

module.exports = {
  registerSchema, loginSchema, bookCreateSchema, bookUpdateSchema, reviewSchema, reviewUpdateSchema,
  noteSchema, profileSchema, adminUserSchema, loanSchema, importSearchSchema, importCreateSchema, listBooksSchema,
};
