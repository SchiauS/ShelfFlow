import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../lib/api.js';
import { ConfirmDialog, Empty, ErrorBox, Loading } from '../components/ui.jsx';

export default function Loans() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('active');
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    try { setItems((await api('/loans/me')).items); } catch (err) { setError(err); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doReturn = async () => {
    const loan = confirm;
    setConfirm(null);
    try {
      await api(`/loans/${loan.id}/return`, { method: 'POST' });
      await load();
    } catch (err) { setError(err); }
  };

  if (!items) return <div className="page"><Loading /></div>;
  const active = items.filter((l) => l.status === 'active');
  const history = items.filter((l) => l.status === 'returned');
  const shown = tab === 'active' ? active : history;

  return (
    <div className="page">
      <h1 style={{ fontSize: '2.3rem' }}>Împrumuturile mele</h1>
      <p className="muted small">{active.length} active · {history.length} în istoric</p>
      <ErrorBox error={error} />

      <div className="tabs">
        <button type="button" className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Active ({active.length})</button>
        <button type="button" className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Istoric ({history.length})</button>
      </div>

      {shown.length === 0 && (
        <Empty title={tab === 'active' ? 'Niciun împrumut activ' : 'Istoricul este gol'}>
          {tab === 'active' ? <Link to="/catalog">Mergi la catalog</Link> : 'Cărțile returnate vor apărea aici.'}
        </Empty>
      )}

      <div style={{ display: 'grid', gap: '0.8rem' }}>
        {shown.map((loan) => (
          <article key={loan.id} className="card">
            <div className="card__body" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ marginBottom: '0.15rem' }}><Link to={`/books/${loan.book.id}`}>{loan.book.title}</Link></h3>
                <p className="small muted" style={{ margin: 0 }}>{loan.book.author}</p>
                <p className="small" style={{ margin: '0.35rem 0 0', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  {loan.status === 'active' ? <Clock size={13} /> : <CheckCircle2 size={13} />}
                  {loan.status === 'active'
                    ? `Retur până la ${new Date(loan.dueAt).toLocaleDateString('ro-RO')}`
                    : `Returnată la ${new Date(loan.returnedAt).toLocaleDateString('ro-RO')}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {loan.overdue && <span className="pill pill--danger">{loan.daysOverdue} zile întârziere</span>}
                {loan.status === 'active' && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(loan)}>
                    <BookMarked size={14} /> Returnează
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Returnezi cartea?"
        body={confirm ? `${confirm.book.title} va redeveni disponibilă în catalog.` : ''}
        confirmLabel="Confirmă returul"
        onConfirm={doReturn}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
