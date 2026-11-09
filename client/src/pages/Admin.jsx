import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, MessageSquare, Users, Library } from 'lucide-react';
import { api } from '../lib/api.js';
import { ConfirmDialog, ErrorBox, Loading, Stars } from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function Admin() {
  const { user: me, isOwner } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [audit, setAudit] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [pendingReview, setPendingReview] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, u, l, a, r] = await Promise.all([
        api('/admin/stats'), api('/admin/users?pageSize=50'), api('/admin/loans'), api('/admin/audit'),
        api('/admin/reviews?pageSize=50'),
      ]);
      setStats(s); setUsers(u.items); setLoans(l.items); setAudit(a.items); setReviews(r.items);
    } catch (err) { setError(err); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const removeReview = async (id) => {
    try {
      await api(`/admin/reviews/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) { setError(err); }
  };

  const updateUser = async (id, patch) => {
    try {
      await api(`/admin/users/${id}`, { method: 'PATCH', body: patch });
      await load();
    } catch (err) { setError(err); }
  };

  if (!stats) return <div className="page"><Loading /></div>;

  return (
    <div className="page">
      <h1 style={{ fontSize: '2.3rem' }}>Administrare</h1>
      <p className="muted small">Zonă rezervată rolurilor ADMIN și OWNER. Toate verificările sunt repetate pe server.</p>
      <ErrorBox error={error} />

      <div className="stats stats--5" style={{ marginBottom: '1.6rem' }}>
        <div className="stat"><div className="stat__value">{stats.books}</div><div className="stat__label"><BookOpen size={12} /> Cărți</div></div>
        <div className="stat"><div className="stat__value">{stats.users}</div><div className="stat__label"><Users size={12} /> Utilizatori</div></div>
        <div className="stat"><div className="stat__value">{stats.activeLoans}</div><div className="stat__label"><Library size={12} /> Împrumuturi active</div></div>
        <div className="stat"><div className="stat__value">{stats.overdue}</div><div className="stat__label"><AlertTriangle size={12} /> Întârziate</div></div>
        <div className="stat"><div className="stat__value">{stats.reviews}</div><div className="stat__label"><MessageSquare size={12} /> Recenzii</div></div>
      </div>

      <div className="tabs">
        {[['overview', 'Sumar'], ['users', 'Utilizatori'], ['loans', 'Împrumuturi'], ['reviews', 'Recenzii'], ['audit', 'Jurnal']].map(([k, label]) => (
          <button key={k} type="button" className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card">
          <div className="card__body">
            <h3>Cărți pe categorie</h3>
            {stats.byCategory.length === 0 && <p className="muted small">Nicio categorie definită.</p>}
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
              {stats.byCategory.map((c) => <li key={c.name}>{c.name}: <strong>{c.count}</strong></li>)}
            </ul>
            <h3 style={{ marginTop: '1.4rem' }}>Ultimele adăugări</h3>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
              {stats.recentBooks.map((b) => <li key={b.id}>{b.title} — {b.author}</li>)}
            </ul>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <>
        <p className="small muted" style={{ margin: '0 0 0.8rem' }}>
          {isOwner
            ? 'Ești owner: poți numi administratori și poți activa sau dezactiva conturile. Contul tău și conturile de tip owner sunt protejate.'
            : 'Contul tău și conturile de administrator sunt protejate — doar ownerul le poate modifica.'}
        </p>
        <div className="card table-wrap">
          <table className="data">
            <thead><tr><th>Nume</th><th>Email</th><th>Rol</th><th>Stare</th><th>Acțiuni</th></tr></thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === me?.id;
                const isProtectedOwner = u.role === 'OWNER';
                const canAct = !isSelf && !isProtectedOwner && (isOwner || u.role !== 'ADMIN');
                const roleStyle = u.role === 'OWNER'
                  ? { background: '#f7ecd8', color: '#8a5b12' }
                  : u.role === 'ADMIN' ? { background: '#e4f1ea', color: '#0a4f3d' } : { background: '#f1ece1', color: '#5d5648' };
                return (
                  <tr key={u.id}>
                    <td>
                      {u.name}
                      {isSelf && <span className="tiny" style={{ marginLeft: 6, color: 'var(--brand-dark)' }}>· tu</span>}
                    </td>
                    <td className="small">{u.email}</td>
                    <td><span className="pill" style={roleStyle}>{u.role}</span></td>
                    <td>{u.isActive ? 'Activ' : 'Dezactivat'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {isProtectedOwner ? <span className="small muted">protejat</span>
                        : !canAct ? <span className="small muted">—</span> : (
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateUser(u.id, { role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })}>
                              {u.role === 'ADMIN' ? 'Fă USER' : 'Fă ADMIN'}
                            </button>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => updateUser(u.id, { isActive: !u.isActive })}>
                              {u.isActive ? 'Dezactivează' : 'Reactivează'}
                            </button>
                          </div>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {tab === 'reviews' && (
        <>
        <p className="small muted" style={{ margin: '0 0 0.8rem' }}>
          Moderare recenzii: poți șterge orice recenzie. Ștergerea este înregistrată în jurnalul de audit.
        </p>
        <div className="card table-wrap">
          <table className="data">
            <thead><tr><th>Carte</th><th>Autor recenzie</th><th>Rating</th><th>Text</th><th>Data</th><th>Acțiuni</th></tr></thead>
            <tbody>
              {reviews.length === 0 && <tr><td colSpan={6} className="muted small">Nicio recenzie.</td></tr>}
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td>{r.book ? <Link to={`/books/${r.book.id}`}>{r.book.title}</Link> : '—'}</td>
                  <td className="small">{r.user ? r.user.name : '—'}<div className="tiny muted">{r.user?.email}</div></td>
                  <td><Stars value={r.rating} /></td>
                  <td className="small" style={{ maxWidth: 320 }}>{r.content.length > 140 ? r.content.slice(0, 140) + '…' : r.content}</td>
                  <td className="small">{new Date(r.createdAt).toLocaleDateString('ro-RO')}</td>
                  <td><button type="button" className="btn btn-danger btn-sm" onClick={() => setPendingReview(r)}>Șterge</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ConfirmDialog
          open={Boolean(pendingReview)}
          title="Ștergi recenzia?"
          body={pendingReview ? `Recenzia „${pendingReview.content.slice(0, 80)}…” pentru ${pendingReview.book?.title || 'carte'} va fi ștearsă definitiv.` : ''}
          confirmLabel="Șterge recenzia"
          danger
          onConfirm={async () => { const r = pendingReview; setPendingReview(null); await removeReview(r.id); }}
          onCancel={() => setPendingReview(null)}
        />
        </>
      )}

      {tab === 'loans' && (
        <div className="card table-wrap">
          <table className="data">
            <thead><tr><th>Carte</th><th>Cititor</th><th>Împrumutat</th><th>Scadent</th><th>Stare</th></tr></thead>
            <tbody>
              {loans.length === 0 && <tr><td colSpan={5} className="muted small">Niciun împrumut.</td></tr>}
              {loans.map((l) => (
                <tr key={l.id}>
                  <td>{l.book?.title}</td>
                  <td className="small">{l.user?.name}</td>
                  <td className="small">{new Date(l.borrowedAt).toLocaleDateString('ro-RO')}</td>
                  <td className="small">{new Date(l.dueAt).toLocaleDateString('ro-RO')}</td>
                  <td>
                    {l.status === 'returned' ? <span className="pill pill--ok">Returnat</span>
                      : l.overdue ? <span className="pill pill--danger">{l.daysOverdue} zile întârziere</span>
                        : <span className="pill pill--out">Activ</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'audit' && (
        <div className="card table-wrap">
          <table className="data">
            <thead><tr><th>Când</th><th>Acțiune</th><th>Țintă</th><th>Detalii</th></tr></thead>
            <tbody>
              {audit.length === 0 && <tr><td colSpan={4} className="muted small">Jurnal gol.</td></tr>}
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="small">{new Date(a.createdAt).toLocaleString('ro-RO')}</td>
                  <td className="small">{a.action}</td>
                  <td className="small">{a.targetType}:{String(a.targetId).slice(0, 8)}</td>
                  <td className="small">{JSON.stringify(a.meta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
