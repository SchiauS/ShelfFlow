import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import BookCard from '../components/BookCard.jsx';
import { Empty, ErrorBox, Loading } from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function Home() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, books: [], total: 0, categories: 0, available: 0 });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [recent, all, cats] = await Promise.all([
          api('/books?pageSize=10&sort=newest'),
          api('/books?pageSize=1'),
          api('/categories'),
        ]);
        if (!alive) return;
        setState({
          loading: false, error: null, books: recent.items, total: all.total,
          categories: cats.items.length, available: 0,
        });
      } catch (error) {
        if (alive) setState((s) => ({ ...s, loading: false, error }));
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="page">
      <section className="hero">
        <div>
          <div className="hero__eyebrow">Biblioteca ta, ordonată</div>
          <h1>Cărțile circulă.<br />Evidența rămâne.</h1>
          <p className="hero__lead">
            ShelfFlow ține catalogul, împrumuturile și recenziile într-un singur loc — cu import din
            Open Library și acces clar pentru fiecare cititor.
          </p>
          <div className="hero__actions">
            <Link to="/catalog" className="btn btn-brand">Explorează catalogul <ArrowRight size={16} /></Link>
            {!user && <Link to="/register" className="btn btn-ghost">Creează cont</Link>}
            {user && <Link to="/books/new" className="btn btn-ghost"><Sparkles size={15} /> Adaugă o carte</Link>}
          </div>
        </div>
        <div className="stats">
          <div className="stat"><div className="stat__value">{state.total}</div><div className="stat__label">Cărți</div></div>
          <div className="stat"><div className="stat__value">{state.categories}</div><div className="stat__label">Categorii</div></div>
          <div className="stat"><div className="stat__value">14</div><div className="stat__label">Zile împrumut</div></div>
        </div>
      </section>

      <div className="section-head">
        <h2>Adăugate recent</h2>
        <Link to="/catalog" className="small">Vezi tot catalogul →</Link>
      </div>

      <ErrorBox error={state.error} />
      {state.loading && <Loading />}
      {!state.loading && !state.error && state.books.length === 0 && (
        <Empty title="Catalogul este gol">
          Începe prin a adăuga o carte manual sau importă una din Open Library.
        </Empty>
      )}
      <div className="grid-books">
        {state.books.map((book) => <BookCard key={book.id} book={book} />)}
      </div>

      {!user && (
        <div className="card" style={{ marginTop: '3rem' }}>
          <div className="card__body" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ marginBottom: '0.2rem' }}>Ai deja un cont?</h3>
              <p className="muted small" style={{ margin: 0 }}>Autentifică-te ca să împrumuți, să recenzezi și să îți salvezi notițele.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-ghost"><Search size={15} /> Autentificare</Link>
              <Link to="/register" className="btn btn-brand">Înregistrare</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
