import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, CalendarDays, Edit3, Hash, Languages, Library, Trash2, Undo2 } from 'lucide-react';
import { api, assetUrl } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { ConfirmDialog, Empty, ErrorBox, Field, Loading, Stars } from '../components/ui.jsx';

export default function BookDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [review, setReview] = useState({ rating: 5, content: '' });
  const [reviewError, setReviewError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api(`/books/${id}`);
      setBook(res.book);
    } catch (err) { setError(err); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const borrow = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const { loan } = await api('/loans', { method: 'POST', body: { bookId: id } });
      setNotice(`Împrumutat până la ${new Date(loan.dueAt).toLocaleDateString('ro-RO')}.`);
      await load();
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  const removeBook = async () => {
    setConfirmDelete(false);
    try {
      await api(`/books/${id}`, { method: 'DELETE' });
      navigate('/catalog');
    } catch (err) { setError(err); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setReviewError(null);
    try {
      await api(`/books/${id}/reviews`, { method: 'POST', body: { rating: Number(review.rating), content: review.content } });
      setReview({ rating: 5, content: '' });
      await load();
    } catch (err) { setReviewError(err); }
  };

  const deleteReview = async (reviewId) => {
    try {
      await api(`/reviews/${reviewId}`, { method: 'DELETE' });
      await load();
    } catch (err) { setError(err); }
  };

  const myReview = book?.reviews?.find((r) => r.ownedByMe);
  const canManage = book && user && (isAdmin || book.canEdit);

  if (!book && !error) return <div className="page"><Loading /></div>;
  if (!book) return <div className="page"><ErrorBox error={error} /><Link to="/catalog" className="btn btn-ghost">Înapoi la catalog</Link></div>;

  return (
    <div className="page">
      <div className="detail">
        <div>
          <div className="detail__cover">
            {book.coverUrl ? <img src={assetUrl(book.coverUrl)} alt={`Coperta ${book.title}`} /> : (
              <div className="book-card__placeholder"><BookOpen size={28} /><span className="book-card__ptitle">{book.title}</span><span className="book-card__pauthor">{book.author}</span></div>
            )}
          </div>
          <div style={{ marginTop: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span className={`pill ${book.availableCopies > 0 ? 'pill--ok' : 'pill--out'}`} style={{ alignSelf: 'flex-start' }}>
              {book.availableCopies > 0 ? `${book.availableCopies} din ${book.totalCopies} disponibile` : 'Toate exemplarele sunt împrumutate'}
            </span>
            {user && book.availableCopies > 0 && (
              <button type="button" className="btn btn-brand" onClick={borrow} disabled={busy}>
                <Library size={16} /> Împrumută 14 zile
              </button>
            )}
            {canManage && (
              <>
                <Link to={`/books/${book.id}/edit`} className="btn btn-ghost"><Edit3 size={15} /> Editează</Link>
                <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Șterge</button>
              </>
            )}
          </div>
        </div>

        <div>
          <div className="tiny muted">{book.category ? book.category.name : 'Fără categorie'}</div>
          <h1 style={{ marginTop: '0.3rem' }}>{book.title}</h1>
          <p className="muted" style={{ fontSize: '1.05rem' }}>{book.author}</p>

          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '0.6rem' }}>
            <Stars value={book.ratingSummary.average} />
            <span className="small muted">
              {book.ratingSummary.count ? `${book.ratingSummary.average} · ${book.ratingSummary.count} recenzii` : 'Fără recenzii încă'}
            </span>
          </div>

          <ErrorBox error={error} />
          {notice && <div className="alert alert--ok">{notice}</div>}

          <dl className="meta-list">
            {book.isbn && <><dt><Hash size={13} /> ISBN</dt><dd>{book.isbn}</dd></>}
            {book.publicationYear && <><dt><CalendarDays size={13} /> An</dt><dd>{book.publicationYear}</dd></>}
            {book.publisher && <><dt>Editură</dt><dd>{book.publisher}</dd></>}
            {book.language && <><dt><Languages size={13} /> Limbă</dt><dd>{book.language}</dd></>}
            <dt>Exemplare</dt><dd>{book.totalCopies}</dd>
            <dt>Sursă</dt><dd>{book.source === 'openlibrary' ? 'Open Library' : 'Adăugată manual'}</dd>
          </dl>

          {book.description ? <p style={{ whiteSpace: 'pre-line' }}>{book.description}</p> : <p className="muted small">Fără descriere.</p>}

          <div className="section-head"><h2 style={{ fontSize: '1.5rem' }}>Recenzii</h2></div>

          {user && !myReview && (
            <form onSubmit={submitReview} className="card" style={{ marginBottom: '1.4rem' }}>
              <div className="card__body">
                <h3>Scrie o recenzie</h3>
                <ErrorBox error={reviewError} />
                <div className="form-grid">
                  <Field label="Rating" htmlFor="rating">
                    <select id="rating" className="select" value={review.rating} onChange={(e) => setReview({ ...review, rating: e.target.value })}>
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {'★'.repeat(n)}</option>)}
                    </select>
                  </Field>
                  <Field label="Text" htmlFor="content" full>
                    <textarea id="content" className="textarea" required maxLength={2000} value={review.content}
                      onChange={(e) => setReview({ ...review, content: e.target.value })} placeholder="Ce ți-a plăcut la carte?" />
                  </Field>
                </div>
                <button type="submit" className="btn btn-brand">Publică recenzia</button>
              </div>
            </form>
          )}

          {book.reviews.length === 0 && <Empty title="Nicio recenzie">Fii primul care scrie o părere.</Empty>}
          {book.reviews.map((r) => (
            <article key={r.id} className="review">
              <div className="review__head">
                <div>
                  <strong>{r.user.name}</strong> <span className="small muted">· {new Date(r.createdAt).toLocaleDateString('ro-RO')}</span>
                </div>
                <Stars value={r.rating} />
              </div>
              <p style={{ margin: '0.4rem 0 0', whiteSpace: 'pre-line' }}>{r.content}</p>
              {r.ownedByMe && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => deleteReview(r.id)}>
                  <Undo2 size={13} /> Șterge recenzia
                </button>
              )}
            </article>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Ștergi cartea?"
        body="Cartea dispare din catalog. Împrumuturile active blochează ștergerea."
        confirmLabel="Șterge definitiv"
        danger
        onConfirm={removeBook}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
