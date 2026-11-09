'use strict';
/**
 * Recenzii demonstrative, idempotente (userId + bookId unic).
 * Rulează după seed-ul principal: node server/scripts/seed-reviews.js
 */
const { sequelize, User, Book, Review } = require('../src/models');

const REVIEWS = [
  {
    email: 'maria@shelfflow.test', title: 'Maestrul și Margareta', rating: 5,
    content: 'Prima lectură m-a derutat, a doua m-a cucerit. Firele narative se leagă abia la final, iar discuția dintre Woland și Yeshua rămâne în minte mult timp după ce închizi cartea.',
  },
  {
    email: 'andrei@shelfflow.test', title: 'Sapiens', rating: 4,
    content: 'Bună ca sinteză și foarte ușor de citit, deși unele generalizări merg prea repede. Merită pentru capitolele despre revoluția agricolă și despre banii ca ficțiune colectivă.',
  },
  {
    email: 'ioana.admin@shelfflow.test', title: 'Clean Code', rating: 4,
    content: 'Încă utilă după atâția ani, mai ales pentru numirea lucrurilor și funcțiile mici. Exemplele în Java sunt cam lungi, dar principiile se transferă direct în proiectele mele.',
  },
  {
    email: 'maria@shelfflow.test', title: '1984', rating: 5,
    content: 'Citită acum, pare mai actuală decât în facultate. Partea cea mai tulburătoare nu e violența, ci modul în care limbajul este retezat până când gândul nu mai are cuvinte.',
  },
  {
    email: 'andrei@shelfflow.test', title: 'Moromeții', rating: 5,
    content: 'Primul volum e o lecție de răbdare narativă: nimic nu se grăbește, dar fiecare scenă din curtea lui Ilie Moromete construiește ceva. Dialogurile sună exact cum trebuie.',
  },
  {
    email: 'ioana.admin@shelfflow.test', title: 'Solenoid', rating: 4,
    content: 'Densă și uneori obositoare, dar cu pagini de o imaginație rară. Am citit-o în reprize; nu e o carte de dus în vacanță, ci una de stat cu ea la masă.',
  },
  {
    email: 'maria@shelfflow.test', title: 'Micul Prinț', rating: 3,
    content: 'Frumos scrisă, dar cred că farmecul depinde mult de vârsta la care o citești. Pentru mine a rămas mai mult o carte despre singurătate decât una pentru copii.',
  },
  {
    email: 'ioana.admin@shelfflow.test', title: 'Designing Data-Intensive Applications', rating: 5,
    content: 'Cea mai bună carte tehnică pe care am citit-o în ultimii ani. Explică trade-off-urile din spatele bazelor de date fără să impună o singură soluție și fără să ascundă complexitatea.',
  },
  {
    email: 'andrei@shelfflow.test', title: 'Enigma Otiliei', rating: 4,
    content: 'Am recitit-o după mult timp și am descoperit altă carte: mai puțin despre Otilia, mai mult despre Felix și despre lumea care se schimbă în jurul lor. Personajele secundare sunt excelente.',
  },
  {
    email: 'maria@shelfflow.test', title: 'O scurtă istorie a timpului', rating: 3,
    content: 'Explică bine primele capitole, apoi devine greu de urmărit fără noțiuni de fizică. Am insistat și m-am ales cu o intuiție mai bună despre entropie, dar am sărit pasaje întregi.',
  },
];

(async () => {
  let created = 0;
  let skipped = 0;
  for (const item of REVIEWS) {
    const user = await User.findOne({ where: { email: item.email } });
    const book = await Book.findOne({ where: { title: item.title } });
    if (!user || !book) { console.log(`skip (lipsă user/carte): ${item.title}`); skipped += 1; continue; }
    const [, isNew] = await Review.findOrCreate({
      where: { userId: user.id, bookId: book.id },
      defaults: { rating: item.rating, content: item.content },
    });
    if (isNew) created += 1; else skipped += 1;
  }
  console.log(`reviews: created=${created} skipped=${skipped}`);
  await sequelize.close();
})().catch((err) => { console.error(err); process.exit(1); });
