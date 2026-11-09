'use strict';
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

const SORT_COLUMNS = {
  title: 'lower(b.title)',
  author: 'lower(b.author)',
  created_at: 'b.created_at',
  newest: 'b.created_at',
};

const ACTIVE_LOANS = "(SELECT count(*) FROM loans l WHERE l.book_id = b.id AND l.status = 'active')";

function buildFilters(params) {
  const where = ['b.deleted_at IS NULL'];
  const replacements = {};
  if (params.q) {
    where.push('(b.title ILIKE :q OR b.author ILIKE :q OR b.isbn ILIKE :q)');
    replacements.q = `%${params.q}%`;
  }
  if (params.title) { where.push('b.title ILIKE :title'); replacements.title = `%${params.title}%`; }
  if (params.author) { where.push('b.author ILIKE :author'); replacements.author = `%${params.author}%`; }
  if (params.isbn) { where.push('b.isbn LIKE :isbn'); replacements.isbn = `${params.isbn}%`; }
  if (params.category) { where.push('c.slug = :category'); replacements.category = params.category; }
  if (params.available === 'true') where.push(`b.total_copies - ${ACTIVE_LOANS} > 0`);
  if (params.available === 'false') where.push(`b.total_copies - ${ACTIVE_LOANS} <= 0`);
  return { where: where.join(' AND '), replacements };
}

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    isbn: row.isbn,
    description: row.description,
    publicationYear: row.publication_year,
    publisher: row.publisher,
    language: row.language,
    totalCopies: row.total_copies,
    availableCopies: Number(row.available_copies),
    coverUrl: row.cover_path ? `/uploads/${row.cover_path}` : null,
    coverSource: row.cover_source,
    source: row.source,
    openLibraryWorkId: row.open_library_work_id,
    openLibraryEditionId: row.open_library_edition_id,
    category: row.category_id ? { id: row.category_id, name: row.category_name, slug: row.category_slug } : null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function list(params) {
  const { where, replacements } = buildFilters(params);
  const order = (SORT_COLUMNS[params.sort] || SORT_COLUMNS.newest) + (params.order === 'asc' ? ' ASC' : ' DESC');
  const offset = (params.page - 1) * params.pageSize;

  const countRows = await sequelize.query(
    `SELECT count(*)::int AS total FROM books b LEFT JOIN categories c ON c.id = b.category_id WHERE ${where}`,
    { replacements, type: QueryTypes.SELECT },
  );

  const rows = await sequelize.query(
    `SELECT b.*, c.name AS category_name, c.slug AS category_slug,
            b.total_copies - ${ACTIVE_LOANS} AS available_copies
       FROM books b LEFT JOIN categories c ON c.id = b.category_id
      WHERE ${where}
      ORDER BY ${order}, b.id
      LIMIT :limit OFFSET :offset`,
    { replacements: { ...replacements, limit: params.pageSize, offset }, type: QueryTypes.SELECT },
  );

  return { items: rows.map(mapRow), total: countRows[0].total, page: params.page, pageSize: params.pageSize };
}

async function findById(id) {
  const rows = await sequelize.query(
    `SELECT b.*, c.name AS category_name, c.slug AS category_slug,
            b.total_copies - ${ACTIVE_LOANS} AS available_copies
       FROM books b LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.id = :id AND b.deleted_at IS NULL`,
    { replacements: { id }, type: QueryTypes.SELECT },
  );
  return rows.length ? mapRow(rows[0]) : null;
}

async function activeLoanCount(bookId, transaction) {
  const [row] = await sequelize.query(
    `SELECT count(*)::int AS count FROM loans WHERE book_id = :bookId AND status = 'active'`,
    { replacements: { bookId }, type: QueryTypes.SELECT, transaction },
  );
  return row.count;
}

module.exports = { list, findById, activeLoanCount, mapRow };
