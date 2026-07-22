import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-gray-200/70 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 font-semibold text-lg tracking-tight text-slate-900">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-300 text-white font-black shadow-lg shadow-sky-500/30">PM</span>
          <span>People Management</span>
        </Link>
        <div className="hidden md:flex items-center gap-1 ml-4 text-sm">
          <Link to="/people" className="px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100">People</Link>
          <Link to="/reports" className="px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100">Reports</Link>
          {user?.role === 'ADMIN' && <Link to="/users" className="px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100">Users</Link>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="pill text-sm bg-white/80 border border-gray-200 text-slate-700 shadow-sm">{user.username} · {user.role}</span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="btn-secondary"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
