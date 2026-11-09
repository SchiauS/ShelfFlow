import { Link } from 'react-router-dom';
import { assetUrl } from '../lib/api.js';

export default function BookCard({ book }) {
  const available = book.availableCopies > 0;
  return (
    <article className="book-card">
      <Link to={`/books/${book.id}`} className="book-card__cover" aria-label={`Detalii ${book.title}`}>
        {book.coverUrl ? (
          <img src={assetUrl(book.coverUrl)} alt={`Coperta cărții ${book.title}`} loading="lazy" />
        ) : (
          <span className="book-card__placeholder">
            <span className="book-card__spine" aria-hidden="true" />
            <span className="book-card__ptitle">{book.title}</span>
            <span className="book-card__pauthor">{book.author}</span>
          </span>
        )}
      </Link>
      <div>
        <h3 className="book-card__title"><Link to={`/books/${book.id}`}>{book.title}</Link></h3>
        <p className="book-card__author">{book.author}</p>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span className={`pill ${available ? 'pill--ok' : 'pill--out'}`}>
          {available ? `${book.availableCopies} disponibile` : 'Indisponibil'}
        </span>
        {book.category && <span className="pill" style={{ background: '#f1ece1', color: '#5d5648' }}>{book.category.name}</span>}
      </div>
    </article>
  );
}
