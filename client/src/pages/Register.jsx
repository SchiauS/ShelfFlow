import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { ErrorBox, Field } from '../components/ui.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  const fieldError = (name) => (error?.details || []).find((d) => d.field === name)?.message;

  return (
    <div className="page page--narrow" style={{ maxWidth: 460 }}>
      <h1 style={{ fontSize: '2.2rem' }}>Creează cont</h1>
      <p className="muted small">Contul nou primește rolul cititor. Administratorii sunt numiți separat.</p>
      <ErrorBox error={error} />
      <form onSubmit={submit} className="card">
        <div className="card__body">
          <Field label="Nume complet" htmlFor="name" error={fieldError('name')}>
            <input id="name" className="input" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="email" error={fieldError('email')}>
            <input id="email" type="email" className="input" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Parolă (minim 10 caractere)" htmlFor="password" error={fieldError('password')}>
            <input id="password" type="password" className="input" autoComplete="new-password" required minLength={10} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <button type="submit" className="btn btn-brand" disabled={busy}><UserPlus size={15} /> {busy ? 'Se creează…' : 'Creează contul'}</button>
          <p className="small muted" style={{ marginTop: '0.9rem' }}>
            Ai deja cont? <Link to="/login">Autentifică-te</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
