import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { ErrorBox, Field, Loading } from '../components/ui.jsx';

const EMPTY = {
  title: '', author: '', isbn: '', publicationYear: '', publisher: '', language: '',
  categoryId: '', totalCopies: 1, description: '',
};

export default function BookForm({ edit = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [cover, setCover] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(edit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/categories').then((r) => setCategories(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!edit) return;
    api(`/books/${id}`).then(({ book }) => {
      if (!book.canEdit && !isAdmin) {
        navigate(`/books/${id}`, { replace: true });
        return;
      }
      setForm({
        title: book.title, author: book.author, isbn: book.isbn || '',
        publicationYear: book.publicationYear || '', publisher: book.publisher || '',
        language: book.language || '', categoryId: book.category?.id || '',
        totalCopies: book.totalCopies, description: book.description || '',
      });
      setLoading(false);
    }).catch((err) => { setError(err); setLoading(false); });
  }, [edit, id, navigate, user]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const fieldError = (name) => (error?.details || []).find((d) => d.field === name)?.message;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      isbn: form.isbn.trim() || null,
      publicationYear: form.publicationYear ? Number(form.publicationYear) : null,
      publisher: form.publisher.trim() || null,
      language: form.language.trim() || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      totalCopies: Number(form.totalCopies) || 1,
      description: form.description.trim() || null,
    };
    try {
      const res = edit
        ? await api(`/books/${id}`, { method: 'PATCH', body: payload })
        : await api('/books', { method: 'POST', body: payload });
      const book = res.book;
      if (cover) {
        const fd = new FormData();
        fd.append('cover', cover);
        await api(`/books/${book.id}/cover`, { method: 'POST', formData: fd });
      }
      navigate(`/books/${book.id}`);
    } catch (err) { setError(err); } finally { setSaving(false); }
  };

  if (loading) return <div className="page"><Loading /></div>;

  return (
    <div className="page page--narrow">
      <Link to={edit ? `/books/${id}` : '/catalog'} className="small" style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
        <ArrowLeft size={14} /> Înapoi
      </Link>
      <h1 style={{ fontSize: '2.2rem', marginTop: '0.8rem' }}>{edit ? 'Editează cartea' : 'Adaugă o carte'}</h1>
      <p className="muted small">Câmpurile marcate cu * sunt obligatorii. Validarea se face pe server.</p>

      <ErrorBox error={error} />

      <form onSubmit={submit} className="card">
        <div className="card__body">
          <div className="form-grid">
            <Field label="Titlu *" htmlFor="title" error={fieldError('title')} full>
              <input id="title" className={`input ${fieldError('title') ? 'input--invalid' : ''}`} required maxLength={300} value={form.title} onChange={set('title')} />
            </Field>
            <Field label="Autor *" htmlFor="author" error={fieldError('author')}>
              <input id="author" className={`input ${fieldError('author') ? 'input--invalid' : ''}`} required maxLength={200} value={form.author} onChange={set('author')} />
            </Field>
            <Field label="ISBN" htmlFor="isbn" error={fieldError('isbn')}>
              <input id="isbn" className="input" inputMode="numeric" maxLength={13} value={form.isbn} onChange={set('isbn')} placeholder="978…" />
            </Field>
            <Field label="An publicare" htmlFor="year" error={fieldError('publicationYear')}>
              <input id="year" className="input" type="number" min="1000" max="2100" value={form.publicationYear} onChange={set('publicationYear')} />
            </Field>
            <Field label="Editură" htmlFor="publisher">
              <input id="publisher" className="input" maxLength={200} value={form.publisher} onChange={set('publisher')} />
            </Field>
            <Field label="Limbă" htmlFor="language">
              <input id="language" className="input" maxLength={40} value={form.language} onChange={set('language')} placeholder="română" />
            </Field>
            <Field label="Categorie" htmlFor="category">
              <select id="category" className="select" value={form.categoryId} onChange={set('categoryId')}>
                <option value="">Fără categorie</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Exemplare" htmlFor="copies" error={fieldError('totalCopies')}>
              <input id="copies" className="input" type="number" min="1" max="1000" value={form.totalCopies} onChange={set('totalCopies')} />
            </Field>
            <Field label="Descriere" htmlFor="description" full>
              <textarea id="description" className="textarea" maxLength={5000} value={form.description} onChange={set('description')} />
            </Field>
            <Field label="Copertă (JPEG, PNG sau WebP, max 2 MB)" htmlFor="cover" full>
              <label htmlFor="cover" className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                <ImagePlus size={15} /> {cover ? cover.name : 'Alege imaginea'}
              </label>
              <input id="cover" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                onChange={(e) => setCover(e.target.files?.[0] || null)} />
            </Field>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-brand" disabled={saving}>{saving ? 'Se salvează…' : edit ? 'Salvează modificările' : 'Adaugă în catalog'}</button>
            <Link to={edit ? `/books/${id}` : '/catalog'} className="btn btn-ghost">Anulează</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
