import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { ErrorBox, Field } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  return (
    <div className="page page--narrow" style={{ maxWidth: 460 }}>
      <h1 style={{ fontSize: '2.2rem' }}>Bine ai revenit</h1>
      <p className="muted small">Autentifică-te ca să împrumuți cărți și să îți gestionezi contul.</p>
      <ErrorBox error={error} />
      <form onSubmit={submit} className="card">
        <div className="card__body">
          <Field label="Email" htmlFor="email">
            <input id="email" type="email" className="input" autoComplete="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Parolă" htmlFor="password">
            <input id="password" type="password" className="input" autoComplete="current-password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <button type="submit" className="btn btn-brand" disabled={busy}><LogIn size={15} /> {busy ? 'Se verifică…' : 'Autentificare'}</button>
          <p className="small muted" style={{ marginTop: '0.9rem' }}>
            Nu ai cont? <Link to="/register">Creează unul</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
