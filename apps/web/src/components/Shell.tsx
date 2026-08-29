import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { PaletaComandos } from './PaletaComandos';
import type { Permiso } from '../lib/api';

/**
 * Navegación filtrada por permiso (`ADR-018`): una sección que el rol no puede
 * abrir no aparece en la barra. No es seguridad —el servidor decide— sino no
 * enseñar puertas que dan a un 403.
 */
const nav: { to: string; label: string; icon: string; requiere: Permiso }[] = [
  { to: '/colaboradores', label: 'Colaboradores', icon: '👥', requiere: 'colaborador:leer' },
  { to: '/planilla', label: 'Planilla', icon: '🧮', requiere: 'planilla:leer' },
];

/** Nombres de rol legibles; el crudo se muestra si aparece uno no previsto. */
const ROL_LEGIBLE: Record<string, string> = {
  GlobalAdmin: 'Administrador global',
  AdminFinanzas: 'Admin. de Finanzas',
  AdminRRHH: 'Admin. de RRHH',
  AsistContable: 'Asistente contable',
  AsistRRHH: 'Asistente de RRHH',
};

export function Shell({ children }: { children: ReactNode }) {
  const { me, logout, puede } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);

  const empresa = me?.empresas.find((e) => e.empresaId === me.empresaActivaId);
  const secciones = nav.filter((n) => puede(n.requiere));

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
          {secciones.map((n) => (
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
        {/*
          El rol, siempre a la vista. En una firma contable la misma persona es
          admin en una empresa y solo-lectura en otra (ADR-011); saber con qué
          sombrero se entró evita el "¿por qué no me deja?" y, peor, actuar
          sobre la empresa equivocada creyendo que se tiene otro permiso.
        */}
        {me?.rol && (
          <div className="mx-3 mt-2 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Tu rol aquí</p>
            <p className="text-sm font-medium text-slate-700">
              {ROL_LEGIBLE[me.rol] ?? me.rol}
            </p>
          </div>
        )}
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
          <div className="flex items-center gap-2">
            <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-400 sm:inline">
              ⌘K
            </kbd>
            <button
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              onClick={() => {
                void logout();
              }}
            >
              Salir
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>

      {/* Overlay del menú en móvil: sin esto el sidebar se abre encima del
          contenido y no hay forma obvia de volver a cerrarlo. */}
      {abierto && (
        <button
          className="fixed inset-0 z-20 bg-slate-900/20 md:hidden"
          onClick={() => {
            setAbierto(false);
          }}
          aria-label="Cerrar menú"
        />
      )}

      <PaletaComandos />
    </div>
  );
}
