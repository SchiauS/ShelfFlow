import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookDown, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { Empty, ErrorBox, Field, Loading } from '../components/ui.jsx';

const FIELDS = [
  { value: 'any', label: 'Oricare' },
  { value: 'title', label: 'Titlu' },
  { value: 'author', label: 'Autor' },
  { value: 'isbn', label: 'ISBN' },
];

export default function ImportBooks() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [field, setField] = useState('any');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const search = async (e) => {
    e.preventDefault();
    setSearching(true); setError(null); setResults(null); setSelected(null); setForm(null);
    try {
      const res = await api(`/import/search?q=${encodeURIComponent(q)}&field=${field}`);
      setResults(res.items);
    } catch (err) { setError(err); } finally { setSearching(false); }
  };

  const pick = (item) => {
    setSelected(item);
    setForm({
      title: item.title, author: item.author, isbn: item.isbn || '',
      publicationYear: item.publicationYear || '', publisher: item.publisher || '',
      language: item.language || '', totalCopies: 1,
    });
  };

  const confirmImport = async (e) => {
    e.preventDefault();
    setSaving(true); setFormError(null);
    try {
      const payload = {
        ...form,
        isbn: form.isbn || null,
        publicationYear: form.publicationYear ? Number(form.publicationYear) : null,
        publisher: form.publisher || null,
        language: form.language || null,
        totalCopies: Number(form.totalCopies) || 1,
        coverId: selected?.coverId || null,
        openLibraryWorkId: selected?.openLibraryWorkId || null,
        openLibraryEditionId: selected?.openLibraryEditionId || null,
      };
      const res = await api('/import/books', { method: 'POST', body: payload });
      navigate(`/books/${res.book.id}`);
    } catch (err) { setFormError(err); } finally { setSaving(false); }
  };

  return (
    <div className="page">
      <h1 style={{ fontSize: '2.3rem' }}>Import din Open Library</h1>
      <p className="muted" style={{ maxWidth: '62ch' }}>
        Caută o carte în catalogul Open Library, verifică metadatele și confirmă importul. Datele sunt
        validate pe server și salvate local — cartea rămâne în bibliotecă și dacă API-ul extern pică.
      </p>

      <form onSubmit={search} className="card" style={{ marginBottom: '1.6rem' }}>
        <div className="card__body">
          <div className="toolbar">
            <Field label="Termen de căutare" htmlFor="q" full>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 11, top: 12, color: '#8b8271' }} />
                <input id="q" className="input" style={{ paddingLeft: 34 }} value={q} minLength={2} required
                  onChange={(e) => setQ(e.target.value)} placeholder="Ex: Dune, Frank Herbert, 9780441013593" />
              </div>
            </Field>
            <Field label="Caută după" htmlFor="field">
              <select id="field" className="select" value={field} onChange={(e) => setField(e.target.value)}>
                {FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Field>
            <button type="submit" className="btn btn-brand" disabled={searching}>{searching ? 'Se caută…' : 'Caută'}</button>
          </div>
        </div>
      </form>

      <ErrorBox error={error} />
      {searching && <Loading label="Se interoghează Open Library…" />}
      {results && results.length === 0 && <Empty title="Niciun rezultat">Încearcă alt titlu, autor sau ISBN.</Empty>}

      {results && results.length > 0 && (
        <div className="grid-books" style={{ marginBottom: '2.4rem' }}>
          {results.map((item, index) => (
            <article key={item.openLibraryWorkId || index} className="book-card">
              <button type="button" className="book-card__cover" onClick={() => pick(item)} style={{ border: 'none', padding: 0, cursor: 'pointer' }}
                aria-label={`Selectează ${item.title}`}>
                {item.coverUrl ? <img src={item.coverUrl} alt="" loading="lazy" /> : <span className="book-card__placeholder">{item.title}</span>}
              </button>
              <div>
                <h3 className="book-card__title">{item.title}</h3>
                <p className="book-card__author">{item.author || 'Autor necunoscut'}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => pick(item)}><BookDown size={14} /> Importă</button>
            </article>
          ))}
        </div>
      )}

      {form && (
        <form onSubmit={confirmImport} className="card">
          <div className="card__body">
            <h2 style={{ fontSize: '1.5rem' }}>Confirmă metadatele</h2>
            <p className="muted small">Poți corecta orice câmp înainte de salvare. Metadatele externe sunt tratate ca date neîncredere.</p>
            <ErrorBox error={formError} />
            <div className="form-grid">
              <Field label="Titlu *" htmlFor="i-title" full>
                <input id="i-title" className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Autor *" htmlFor="i-author">
                <input id="i-author" className="input" required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              </Field>
              <Field label="ISBN" htmlFor="i-isbn">
                <input id="i-isbn" className="input" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
              </Field>
              <Field label="An" htmlFor="i-year">
                <input id="i-year" className="input" type="number" value={form.publicationYear} onChange={(e) => setForm({ ...form, publicationYear: e.target.value })} />
              </Field>
              <Field label="Editură" htmlFor="i-pub">
                <input id="i-pub" className="input" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
              </Field>
              <Field label="Limbă" htmlFor="i-lang">
                <input id="i-lang" className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
              </Field>
              <Field label="Exemplare" htmlFor="i-copies">
                <input id="i-copies" className="input" type="number" min="1" value={form.totalCopies} onChange={(e) => setForm({ ...form, totalCopies: e.target.value })} />
              </Field>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-brand" disabled={saving}>{saving ? 'Se importă…' : 'Salvează în catalog'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setForm(null); setSelected(null); }}>Renunță</button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
