import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { ConfirmDialog, ErrorBox, Field, Loading } from '../components/ui.jsx';

export default function Profile() {
  const { refresh } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    try { setProfile((await api('/profile')).profile); } catch (err) { setError(err); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setError(null); setSaved(false);
    try {
      const res = await api('/profile', { method: 'PATCH', body: { name: profile.name, phone: profile.phone || null } });
      setProfile({ ...profile, ...res.profile });
      setSaved(true);
      await refresh();
    } catch (err) { setError(err); }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await api('/profile/notes', { method: 'POST', body: { content: note.trim() } });
      setNote('');
      await load();
    } catch (err) { setError(err); }
  };

  const saveNote = async () => {
    try {
      await api(`/profile/notes/${editing.id}`, { method: 'PATCH', body: { content: editing.content } });
      setEditing(null);
      await load();
    } catch (err) { setError(err); }
  };

  const removeNote = async () => {
    const target = confirm;
    setConfirm(null);
    try {
      await api(`/profile/notes/${target.id}`, { method: 'DELETE' });
      await load();
    } catch (err) { setError(err); }
  };

  if (!profile) return <div className="page"><Loading /></div>;

  return (
    <div className="page page--narrow">
      <h1 style={{ fontSize: '2.3rem' }}>Profilul meu</h1>
      <p className="muted small">Datele de mai jos sunt private. Numai tu (și administratorul, pentru suport) le puteți vedea.</p>
      <ErrorBox error={error} />
      {saved && <div className="alert alert--ok">Profil salvat.</div>}

      <form onSubmit={saveProfile} className="card" style={{ marginBottom: '1.6rem' }}>
        <div className="card__body">
          <div className="form-grid">
            <Field label="Nume" htmlFor="name">
              <input id="name" className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required minLength={2} />
            </Field>
            <Field label="Email (nu poate fi modificat)" htmlFor="email">
              <input id="email" className="input" value={profile.email} disabled />
            </Field>
            <Field label="Telefon (opțional)" htmlFor="phone">
              <input id="phone" className="input" value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </Field>
            <Field label="Rol">
              <input className="input" value={profile.role} disabled />
            </Field>
          </div>
          <button type="submit" className="btn btn-brand"><Save size={15} /> Salvează</button>
        </div>
      </form>

      <div className="section-head"><h2 style={{ fontSize: '1.5rem' }}>Notițe private</h2></div>
      <form onSubmit={addNote} className="card" style={{ marginBottom: '1rem' }}>
        <div className="card__body">
          <Field label="Notiță nouă" htmlFor="note">
            <textarea id="note" className="textarea" maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: de returnat până vineri, am discutat cu…" />
          </Field>
          <button type="submit" className="btn btn-brand btn-sm"><Plus size={14} /> Adaugă notița</button>
        </div>
      </form>

      {profile.notes.length === 0 && <p className="muted small">Nicio notiță salvată.</p>}
      <div style={{ display: 'grid', gap: '0.6rem' }}>
        {profile.notes.map((n) => (
          <article key={n.id} className="card">
            <div className="card__body">
              {editing?.id === n.id ? (
                <>
                  <textarea className="textarea" value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
                  <div className="form-actions">
                    <button type="button" className="btn btn-brand btn-sm" onClick={saveNote}>Salvează</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Anulează</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ whiteSpace: 'pre-line', marginBottom: '0.5rem' }}>{n.content}</p>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span className="tiny muted">{new Date(n.createdAt).toLocaleDateString('ro-RO')}</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...n })}><Pencil size={13} /> Editează</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirm(n)}><Trash2 size={13} /> Șterge</button>
                  </div>
                </>
              )}
            </div>
          </article>
        ))}
      </div>

      <ConfirmDialog open={Boolean(confirm)} title="Ștergi notița?" body="Acțiunea este definitivă." danger
        confirmLabel="Șterge" onConfirm={removeNote} onCancel={() => setConfirm(null)} />
    </div>
  );
}
