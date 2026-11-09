import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../lib/api.js';
import BookCard from '../components/BookCard.jsx';
import { Empty, ErrorBox, Field, Loading, Pagination } from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';

const SORTS = [
  { value: 'newest', label: 'Cele mai noi' },
  { value: 'title', label: 'Titlu A→Z' },
  { value: 'author', label: 'Autor A→Z' },
];

export default function Catalog() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ loading: true, error: null, items: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState(params.get('q') || '');

  const query = useMemo(() => ({
    q: params.get('q') || '',
    category: params.get('category') || '',
    available: params.get('available') || '',
    sort: params.get('sort') || 'newest',
    page: Number(params.get('page') || 1),
    pageSize: 12,
  }), [params]);

  useEffect(() => {
    api('/categories').then((r) => setCategories(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q) next.set('q', q); else next.delete('q');
      next.delete('page');
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    let alive = true;
    setData((d) => ({ ...d, loading: true, error: null }));
    const search = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => { if (v) search.set(k, String(v)); });
    api(`/books?${search.toString()}`)
      .then((res) => { if (alive) setData({ loading: false, error: null, items: res.items, total: res.total }); })
      .catch((error) => { if (alive) setData((d) => ({ ...d, loading: false, error })); });
    return () => { alive = false; };
  }, [query]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  const setPage = (page) => {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page">
      <div className="section-head" style={{ marginTop: 0 }}>
        <div>
          <h1 style={{ fontSize: '2.4rem' }}>Catalog</h1>
          <p className="muted small" style={{ margin: 0 }}>
            {data.loading ? 'Se caută…' : `${data.total} ${data.total === 1 ? 'carte' : 'cărți'} în bibliotecă`}
          </p>
        </div>
        {user && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link to="/import" className="btn btn-ghost"><Download size={15} /> Import Open Library</Link>
            <Link to="/books/new" className="btn btn-brand"><Plus size={15} /> Adaugă carte</Link>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.6rem' }}>
        <div className="card__body">
          <div className="toolbar">
            <Field label="Caută" htmlFor="q" full>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 11, top: 12, color: '#8b8271' }} />
                <input id="q" className="input" style={{ paddingLeft: 34 }} placeholder="Titlu, autor sau ISBN…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </Field>
            <Field label="Categorie" htmlFor="category">
              <select id="category" className="select" value={query.category} onChange={(e) => update('category', e.target.value)}>
                <option value="">Toate</option>
                {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Disponibilitate" htmlFor="available">
              <select id="available" className="select" value={query.available} onChange={(e) => update('available', e.target.value)}>
                <option value="">Toate</option>
                <option value="true">Disponibile</option>
                <option value="false">Împrumutate</option>
              </select>
            </Field>
            <Field label="Sortează" htmlFor="sort">
              <select id="sort" className="select" value={query.sort} onChange={(e) => update('sort', e.target.value)}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="small muted" style={{ marginTop: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <SlidersHorizontal size={13} /> Filtrele se aplică pe server, pe datele din PostgreSQL.
          </div>
        </div>
      </div>

      <ErrorBox error={data.error} />
      {data.loading && (
        <div className="grid-books">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '2 / 3.55' }} />)}
        </div>
      )}
      {!data.loading && !data.error && data.items.length === 0 && (
        <Empty title="Nicio carte găsită">Încearcă alt termen sau elimină filtrele.</Empty>
      )}
      <div className="grid-books">
        {!data.loading && data.items.map((book) => <BookCard key={book.id} book={book} />)}
      </div>
      <Pagination page={query.page} pageSize={query.pageSize} total={data.total} onChange={setPage} />
    </div>
  );
}
