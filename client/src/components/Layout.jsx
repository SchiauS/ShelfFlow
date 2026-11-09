import { NavLink, Link, useNavigate } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Library, Upload, User, LogOut, ShieldCheck, BookMarked } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand">
            <span className="brand__mark"><BookOpen size={17} /></span>
            ShelfFlow
          </Link>
          <nav className="nav">
            <NavLink to="/catalog">Catalog</NavLink>
            {user && <NavLink to="/import">Import</NavLink>}
            {user && <NavLink to="/loans">Împrumuturile mele</NavLink>}
            {user && <NavLink to="/profile">Profil</NavLink>}
            {isAdmin && <NavLink to="/admin">Administrare</NavLink>}
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <span className="small muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>
                  <LogOut size={14} /> Ieși
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Autentificare</Link>
                <Link to="/register" className="btn btn-brand btn-sm">Cont nou</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <span>ShelfFlow — proiect academic de bibliotecă digitală.</span>
          <span>Express · PostgreSQL · React</span>
          <span>
            © {new Date().getFullYear()}{' '}
            <a href="https://schiausebastian.ro" target="_blank" rel="noopener noreferrer">Schiau Sebastian-Adrian</a>
          </span>
        </div>
      </footer>
    </>
  );
}

export function SidebarLinks() {
  return null;
}
