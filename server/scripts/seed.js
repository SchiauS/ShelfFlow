'use strict';
const config = require('../src/config');
const { sequelize, User, Book, Category, Loan, Review, PrivateNote } = require('../src/models');
const { hash } = require('../src/lib/password');

const CATEGORIES = [
  ['Ficțiune', 'fiction'], ['Istorie', 'istorie'], ['Știință', 'stiinta'],
  ['Poezie', 'poezie'], ['Tehnologie', 'tehnologie'], ['Filosofie', 'filosofie'],
];

const BOOKS = [
  ['Micul Prinț', 'Antoine de Saint-Exupéry', 1943, 'Ficțiune', 3, '9786069003295'],
  ['1984', 'George Orwell', 1949, 'Ficțiune', 2, '9789734644224'],
  ['Maestrul și Margareta', 'Mihail Bulgakov', 1967, 'Ficțiune', 2, null],
  ['Enigma Otiliei', 'George Călinescu', 1938, 'Ficțiune', 1, null],
  ['Moromeții', 'Marin Preda', 1955, 'Ficțiune', 2, null],
  ['Sapiens', 'Yuval Noah Harari', 2011, 'Istorie', 2, '9786068562007'],
  ['Istoria Românilor', 'Constantin C. Giurescu', 1937, 'Istorie', 1, null],
  ['O scurtă istorie a timpului', 'Stephen Hawking', 1988, 'Știință', 2, '9789731036206'],
  ['Gödel, Escher, Bach', 'Douglas Hofstadter', 1979, 'Știință', 1, null],
  ['Cântecul lui Achille', 'Madeline Miller', 2011, 'Ficțiune', 1, null],
  ['Lampa lui Aladin', 'Ion Creangă', 1875, 'Poezie', 1, null],
  ['Poeme', 'Mihai Eminescu', 1883, 'Poezie', 3, null],
  ['Testamentul', 'Tudor Arghezi', 1927, 'Poezie', 1, null],
  ['Clean Code', 'Robert C. Martin', 2008, 'Tehnologie', 2, '9780132350884'],
  ['Designing Data-Intensive Applications', 'Martin Kleppmann', 2017, 'Tehnologie', 2, '9781449373320'],
  ['Refactoring', 'Martin Fowler', 2018, 'Tehnologie', 1, '9780134757599'],
  ['The Pragmatic Programmer', 'Andrew Hunt', 1999, 'Tehnologie', 1, '9780201616224'],
  ['Meditații', 'Marcus Aurelius', 2004, 'Filosofie', 2, null],
  ['Așa grăit-a Zarathustra', 'Friedrich Nietzsche', 1883, 'Filosofie', 1, null],
  ['Critica rațiunii pure', 'Immanuel Kant', 1998, 'Filosofie', 1, null],
  ['Cucerirea Americii', 'Tzvetan Todorov', 1982, 'Istorie', 1, null],
  ['Cărțile lui Jacob', 'Olga Tokarczuk', 2014, 'Ficțiune', 1, null],
  ['Solenoid', 'Mircea Cărtărescu', 2015, 'Ficțiune', 2, null],
  ['Teoria literaturii', 'René Wellek', 1949, 'Ficțiune', 1, null],
];

async function main() {
  const passwordHash = await hash(config.seedPassword);
  await sequelize.authenticate();
  await sequelize.query('TRUNCATE admin_audit_log, reviews, private_notes, loans, books, categories, users RESTART IDENTITY CASCADE');

  const users = await User.bulkCreate([
    { name: 'Sebastian Schiau', email: 'admin@shelfflow.test', passwordHash, role: 'OWNER' },
    { name: 'Ioana Pavel', email: 'ioana.admin@shelfflow.test', passwordHash, role: 'ADMIN' },
    { name: 'Andrei Popescu', email: 'andrei@shelfflow.test', passwordHash, role: 'USER' },
    { name: 'Maria Ionescu', email: 'maria@shelfflow.test', passwordHash, role: 'USER' },
  ], { returning: true });

  const cats = {};
  for (const [name, slug] of CATEGORIES) {
    const c = await Category.create({ name, slug });
    cats[slug] = c.id;
  }
  const slugByLabel = { 'Ficțiune': 'fiction', 'Istorie': 'istorie', 'Știință': 'stiinta', 'Poezie': 'poezie', 'Tehnologie': 'tehnologie', 'Filosofie': 'filosofie' };

  const books = [];
  for (const [title, author, year, cat, copies, isbn] of BOOKS) {
    books.push(await Book.create({
      createdBy: users[0].id, title, author, publicationYear: year,
      categoryId: cats[slugByLabel[cat]], totalCopies: copies, isbn,
      language: 'română', publisher: null,
      description: `${title} — ediție în catalogul ShelfFlow, disponibilă pentru împrumut.`,
      source: 'manual',
    }));
  }

  const days = (n) => new Date(Date.now() + n * 86400000);
  const active = [
    [users[2].id, books[0].id, -5, 9], [users[3].id, books[1].id, -3, 11],
    [users[2].id, books[6].id, -20, -6], [users[3].id, books[10].id, -1, 13],
  ];
  for (const [userId, bookId, borrowed, due] of active) {
    await Loan.create({ userId, bookId, borrowedAt: days(borrowed), dueAt: days(due), status: 'active' });
  }
  const returned = [
    [users[2].id, books[2].id, -40, -26], [users[3].id, books[5].id, -30, -16], [users[2].id, books[8].id, -12, 2],
  ];
  for (const [userId, bookId, borrowed, due] of returned) {
    await Loan.create({ userId, bookId, borrowedAt: days(borrowed), dueAt: days(due), returnedAt: days(due - 1), status: 'returned' });
  }

  await Review.bulkCreate([
    { userId: users[2].id, bookId: books[0].id, rating: 5, content: 'O carte pe care o recitești la fiecare vârstă.' },
    { userId: users[3].id, bookId: books[1].id, rating: 4, content: 'Cutremurător de actuală.' },
    { userId: users[3].id, bookId: books[13].id, rating: 5, content: 'Referință pentru orice programator.' },
    { userId: users[2].id, bookId: books[5].id, rating: 4, content: 'Bună sinteză, uneori prea generală.' },
  ]);

  await PrivateNote.bulkCreate([
    { userId: users[2].id, content: 'De returnat „Sapiens” până vineri.' },
    { userId: users[2].id, content: 'Recomandă „Solenoid” pentru clubul de lectură.' },
    { userId: users[3].id, content: 'Verifică dacă „Clean Code” are ediția a doua.' },
  ]);

  console.log(`seed ok: ${users.length} users, ${books.length} books, ${active.length + returned.length} loans`);
  await sequelize.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
