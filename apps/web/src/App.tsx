import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Shell } from './components/Shell';
import { Login } from './pages/Login';
import { SeleccionarEmpresa } from './pages/SeleccionarEmpresa';
import { Colaboradores } from './pages/Colaboradores';
import { ColaboradorWizard } from './pages/ColaboradorWizard';
import { ColaboradorDetalle } from './pages/ColaboradorDetalle';
import { Planillas } from './pages/Planillas';

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
        {/* Rutas estáticas (/nuevo) rankean por encima de la dinámica (/:id) en
            React Router v6 sin importar el orden de declaración. */}
        <Route path="/colaboradores/:id" element={<Protegido><ColaboradorDetalle /></Protegido>} />
        <Route path="/planilla" element={<Protegido><Planillas /></Protegido>} />
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

/**
 * Selector de empresa.
 *
 * Antes rebotaba a `/colaboradores` en cuanto la sesión tenía empresa activa,
 * lo que rompía el botón "cambiar" de la barra superior: para cambiar de
 * empresa siempre hay una activa, así que el enlace navegaba aquí y esta ruta
 * lo devolvía de inmediato. Se veía como un botón muerto.
 *
 * La redirección solo debe darse cuando el usuario llega aquí **sin haber
 * elegido**, que es el caso del login; entrar a propósito a cambiar de empresa
 * es un uso legítimo de la pantalla. `SeleccionarEmpresa` marca cuál es la
 * activa y ofrece volver.
 */
function RutaSeleccion() {
  const { cargando, me } = useAuth();
  if (cargando) return <Pantalla>Cargando…</Pantalla>;
  if (!me) return <Navigate to="/login" replace />;
  return <SeleccionarEmpresa />;
}
