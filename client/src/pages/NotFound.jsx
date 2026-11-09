import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page page--narrow" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <div className="tiny muted">Eroare 404</div>
      <h1>Pagina nu există</h1>
      <p className="muted">Linkul poate fi greșit sau cartea a fost ștearsă.</p>
      <Link to="/" className="btn btn-brand">Înapoi acasă</Link>
    </div>
  );
}
