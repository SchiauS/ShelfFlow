import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, Users, Library } from 'lucide-react';
import { api } from '../lib/api.js';
import { ErrorBox, Loading } from '../components/ui.jsx';

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, u, l, a] = await Promise.all([
        api('/admin/stats'), api('/admin/users?pageSize=50'), api('/admin/loans'), api('/admin/audit'),
      ]);
      setStats(s); setUsers(u.items); setLoans(l.items); setAudit(a.items);
    } catch (err) { setError(err); }
  }, []);
  useEffect(() => { load(); }, [load]);

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
      <p className="muted small">Zonă rezervată rolului ADMIN. Toate verificările sunt repetate pe server.</p>
      <ErrorBox error={error} />

      <div className="stats stats--4" style={{ marginBottom: '1.6rem' }}>
        <div className="stat"><div className="stat__value">{stats.books}</div><div className="stat__label"><BookOpen size={12} /> Cărți</div></div>
        <div className="stat"><div className="stat__value">{stats.users}</div><div className="stat__label"><Users size={12} /> Utilizatori</div></div>
        <div className="stat"><div className="stat__value">{stats.activeLoans}</div><div className="stat__label"><Library size={12} /> Împrumuturi active</div></div>
        <div className="stat"><div className="stat__value">{stats.overdue}</div><div className="stat__label"><AlertTriangle size={12} /> Întârziate</div></div>
      </div>

      <div className="tabs">
        {[['overview', 'Sumar'], ['users', 'Utilizatori'], ['loans', 'Împrumuturi'], ['audit', 'Jurnal']].map(([k, label]) => (
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
        <div className="card table-wrap">
          <table className="data">
            <thead><tr><th>Nume</th><th>Email</th><th>Rol</th><th>Stare</th><th>Acțiuni</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="small">{u.email}</td>
                  <td><span className="pill" style={{ background: u.role === 'ADMIN' ? '#e4f1ea' : '#f1ece1', color: u.role === 'ADMIN' ? '#0a4f3d' : '#5d5648' }}>{u.role}</span></td>
                  <td>{u.isActive ? 'Activ' : 'Dezactivat'}</td>
                  <td style={{ display: 'flex', gap: '0.35rem' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateUser(u.id, { role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })}>
                      {u.role === 'ADMIN' ? 'Fă USER' : 'Fă ADMIN'}
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => updateUser(u.id, { isActive: !u.isActive })}>
                      {u.isActive ? 'Dezactivează' : 'Reactivează'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
