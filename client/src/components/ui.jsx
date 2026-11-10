import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export function Stars({ value = 0, max = 5 }) {
  const full = Math.round(value);
  return (
    <span className="stars" aria-label={`${value} din ${max} stele`}>
      {'★'.repeat(full)}{'☆'.repeat(Math.max(0, max - full))}
    </span>
  );
}

export function Loading({ label = 'Se încarcă…' }) {
  return (
    <div className="empty" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
      {label}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children ? <div className="small">{children}</div> : null}
    </div>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  const details = error.details || [];
  return (
    <div className="alert alert--error" role="alert">
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 600 }}>
        <AlertTriangle size={16} /> {error.message}
      </div>
      {details.length > 0 && (
        <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0 }}>
          {details.map((d, i) => <li key={i}>{d.field ? `${d.field}: ` : ''}{d.message}</li>)}
        </ul>
      )}
    </div>
  );
}

export function Field({ label, error, htmlFor, children, full }) {
  return (
    <div className={`field ${full ? 'field--full' : ''}`}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error && <div className="field__error">{error}</div>}
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirmă', onConfirm, onCancel, danger }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dialog">
        <h3>{title}</h3>
        <p className="muted small">{body}</p>
        <div className="form-actions">
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-brand'}`} onClick={onConfirm}>{confirmLabel}</button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Renunță</button>
        </div>
      </div>
    </div>
  );
}

export function LoanDialog({ open, book, defaultDays = 14, maxDays = 30, busy, onConfirm, onCancel }) {
  const [days, setDays] = useState(String(defaultDays));

  useEffect(() => { if (open) setDays(String(defaultDays)); }, [open, defaultDays]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const value = Number(days);
  const valid = Number.isInteger(value) && value >= 1 && value <= maxDays;
  const dueAt = valid ? new Date(Date.now() + value * 86400000) : null;

  const submit = (e) => { e.preventDefault(); if (valid && !busy) onConfirm(value); };

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label="Împrumută cartea">
      <form className="dialog" onSubmit={submit}>
        <h3>Împrumută „{book?.title}”</h3>
        <p className="muted small" style={{ marginTop: 0 }}>Alege perioada de împrumut, între 1 și {maxDays} zile.</p>
        <label className="small" htmlFor="loan-days" style={{ fontWeight: 600 }}>Număr de zile</label>
        <input
          id="loan-days"
          className="input"
          type="number"
          inputMode="numeric"
          min="1"
          max={maxDays}
          step="1"
          value={days}
          autoFocus
          onChange={(e) => setDays(e.target.value)}
          aria-invalid={!valid}
        />
        <div className="loan-quick" role="group" aria-label="Perioade rapide">
          {[7, 14, 21, 30].map((n) => (
            <button key={n} type="button" className={`btn btn-ghost btn-sm${Number(days) === n ? ' is-active' : ''}`} onClick={() => setDays(String(n))}>
              {n} zile
            </button>
          ))}
        </div>
        <p className={`small ${valid ? 'muted' : 'error-text'}`} style={{ minHeight: '1.2rem' }}>
          {valid ? `Retur până la ${dueAt.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}.` : `Introdu un număr întreg între 1 și ${maxDays}.`}
        </p>
        <div className="form-actions">
          <button type="submit" className="btn btn-brand" disabled={!valid || busy}>
            {busy ? 'Se procesează…' : 'Confirmă împrumutul'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Renunță</button>
        </div>
      </form>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', marginTop: '2rem' }}>
      <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Înapoi</button>
      <span className="small muted">Pagina {page} din {pages}</span>
      <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Înainte</button>
    </div>
  );
}
