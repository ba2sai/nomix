import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const nav = [
  { to: '/colaboradores', label: 'Colaboradores', icon: '👥' },
  { to: '/planilla', label: 'Planilla', icon: '🧮' },
];

export function Shell({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);

  const empresa = me?.empresas.find((e) => e.empresaId === me.empresaActivaId);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <span className="text-xl">🧾</span>
          <span className="text-lg font-bold text-marca-700">Nomix</span>
        </div>
        <nav className="p-3">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={() => setAbierto(false)}
              className={({ isActive }) =>
                `mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-marca-50 text-marca-700' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <span>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <button
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            onClick={() => setAbierto((v) => !v)}
            aria-label="Menú"
          >
            ☰
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="hidden sm:inline">Empresa activa:</span>
            <span className="font-semibold text-slate-800">{empresa?.nombreComercial ?? '—'}</span>
            {me && me.empresas.length > 1 && (
              <button
                className="ml-2 rounded-md px-2 py-1 text-xs text-marca-600 hover:bg-marca-50"
                onClick={() => navigate('/seleccionar-empresa')}
              >
                cambiar
              </button>
            )}
          </div>
          <button
            className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            onClick={() => {
              void logout();
            }}
          >
            Salir
          </button>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
