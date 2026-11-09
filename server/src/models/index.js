'use strict';
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../db');

class User extends Model {}
User.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  role: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'USER' },
  phone: { type: DataTypes.STRING(32) },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
}, { sequelize, modelName: 'User', tableName: 'users', underscored: true });

class Category extends Model {}
Category.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(80), allowNull: false },
  slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
}, { sequelize, modelName: 'Category', tableName: 'categories', underscored: true });

class Book extends Model {}
Book.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  title: { type: DataTypes.STRING(300), allowNull: false },
  author: { type: DataTypes.STRING(200), allowNull: false },
  isbn: { type: DataTypes.STRING(20) },
  description: { type: DataTypes.TEXT },
  publicationYear: { type: DataTypes.INTEGER, field: 'publication_year' },
  publisher: { type: DataTypes.STRING(200) },
  language: { type: DataTypes.STRING(40) },
  totalCopies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: 'total_copies' },
  categoryId: { type: DataTypes.INTEGER, field: 'category_id' },
  coverPath: { type: DataTypes.STRING(255), field: 'cover_path' },
  coverSource: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'none', field: 'cover_source' },
  source: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'manual' },
  openLibraryWorkId: { type: DataTypes.STRING(40), field: 'open_library_work_id' },
  openLibraryEditionId: { type: DataTypes.STRING(40), field: 'open_library_edition_id' },
}, { sequelize, modelName: 'Book', tableName: 'books', underscored: true, paranoid: true, deletedAt: 'deleted_at' });

class Loan extends Model {}
Loan.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  bookId: { type: DataTypes.UUID, allowNull: false, field: 'book_id' },
  borrowedAt: { type: DataTypes.DATE, field: 'borrowed_at' },
  dueAt: { type: DataTypes.DATE, allowNull: false, field: 'due_at' },
  returnedAt: { type: DataTypes.DATE, field: 'returned_at' },
  status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'active' },
}, { sequelize, modelName: 'Loan', tableName: 'loans', underscored: true });

class Review extends Model {}
Review.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  bookId: { type: DataTypes.UUID, allowNull: false, field: 'book_id' },
  rating: { type: DataTypes.SMALLINT, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
}, { sequelize, modelName: 'Review', tableName: 'reviews', underscored: true });

class PrivateNote extends Model {}
PrivateNote.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  content: { type: DataTypes.TEXT, allowNull: false },
}, { sequelize, modelName: 'PrivateNote', tableName: 'private_notes', underscored: true });

class AuditLog extends Model {}
AuditLog.init({
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  actorId: { type: DataTypes.UUID, field: 'actor_id' },
  action: { type: DataTypes.STRING(60), allowNull: false },
  targetType: { type: DataTypes.STRING(40), field: 'target_type' },
  targetId: { type: DataTypes.STRING(64), field: 'target_id' },
  meta: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, { sequelize, modelName: 'AuditLog', tableName: 'admin_audit_log', underscored: true, updatedAt: false });

Category.hasMany(Book, { foreignKey: 'categoryId', as: 'books' });
Book.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Book.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Loan.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });
Loan.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Book.hasMany(Loan, { foreignKey: 'bookId', as: 'loans' });
Review.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Book.hasMany(Review, { foreignKey: 'bookId', as: 'reviews' });
PrivateNote.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { sequelize, User, Category, Book, Loan, Review, PrivateNote, AuditLog };
