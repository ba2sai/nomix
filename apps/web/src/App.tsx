import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Shell } from './components/Shell';
import { Login } from './pages/Login';
import { SeleccionarEmpresa } from './pages/SeleccionarEmpresa';
import { Colaboradores } from './pages/Colaboradores';
import { ColaboradorWizard } from './pages/ColaboradorWizard';
import { PlanillaPreview } from './pages/PlanillaPreview';

function Protegido({ children }: { children: ReactNode }) {
  const { cargando, me } = useAuth();
  if (cargando) return <Pantalla>Cargando…</Pantalla>;
  if (!me) return <Navigate to="/login" replace />;
  if (!me.empresaActivaId) return <Navigate to="/seleccionar-empresa" replace />;
  return <Shell>{children}</Shell>;
}

function Pantalla({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center text-slate-500">{children}</div>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<RutaLogin />} />
        <Route path="/seleccionar-empresa" element={<RutaSeleccion />} />
        <Route path="/colaboradores" element={<Protegido><Colaboradores /></Protegido>} />
        <Route path="/colaboradores/nuevo" element={<Protegido><ColaboradorWizard /></Protegido>} />
        <Route path="/planilla" element={<Protegido><PlanillaPreview /></Protegido>} />
        <Route path="*" element={<Navigate to="/colaboradores" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function RutaLogin() {
  const { cargando, me } = useAuth();
  if (cargando) return <Pantalla>Cargando…</Pantalla>;
  if (me) return <Navigate to="/colaboradores" replace />;
  return <Login />;
}

function RutaSeleccion() {
  const { cargando, me } = useAuth();
  if (cargando) return <Pantalla>Cargando…</Pantalla>;
  if (!me) return <Navigate to="/login" replace />;
  if (me.empresaActivaId) return <Navigate to="/colaboradores" replace />;
  return <SeleccionarEmpresa />;
}
