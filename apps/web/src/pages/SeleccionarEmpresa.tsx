import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Tarjeta } from '../components/ui';

/** Nombres de rol legibles; se muestra el crudo si aparece uno no previsto. */
const ROL_LEGIBLE: Record<string, string> = {
  GlobalAdmin: 'Administrador global',
  AdminFinanzas: 'Admin. de Finanzas',
  AdminRRHH: 'Admin. de RRHH',
  AsistContable: 'Asistente contable',
  AsistRRHH: 'Asistente de RRHH',
};

/**
 * Selector de empresa. Sirve a dos momentos distintos:
 *
 *  - **Al iniciar sesión**, cuando todavía no hay empresa activa.
 *  - **Al cambiar de empresa** desde la barra superior, cuando sí la hay.
 *
 * El segundo caso es el que estaba roto: la ruta rebotaba a `/colaboradores`
 * en cuanto detectaba empresa activa, así que el botón "cambiar" no llegaba
 * nunca a pintar esta pantalla. Ahora la redirección la decide esta página
 * *después* de elegir, y no la ruta *antes* de mostrarla.
 */
export function SeleccionarEmpresa() {
  const { me, seleccionarEmpresa } = useAuth();
  const navigate = useNavigate();
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hayActiva = me?.empresaActivaId != null;

  async function elegir(id: string) {
    setCargando(id);
    setError(null);
    try {
      await seleccionarEmpresa(id);
      // Cambiar de empresa cambia el inquilino de TODA la aplicación, así que
      // se sale de aquí a una pantalla neutra. `replace` evita que el botón
      // "atrás" del navegador devuelva al selector en un estado ya resuelto.
      void navigate('/colaboradores', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar de empresa');
    } finally {
      setCargando(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-center text-xl font-bold text-slate-800">
          {hayActiva ? 'Cambiar de empresa' : 'Elige una empresa'}
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          {me?.empresas.length === 1
            ? 'Tienes acceso a 1 empresa'
            : `Tienes acceso a ${String(me?.empresas.length ?? 0)} empresas`}
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-center text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {me?.empresas.map((e) => {
            const activa = e.empresaId === me.empresaActivaId;
            return (
              <Tarjeta key={e.empresaId} className={activa ? 'border-marca-300 bg-marca-50' : ''}>
                <button
                  className="flex w-full items-center justify-between text-left disabled:opacity-60"
                  disabled={cargando !== null}
                  onClick={() => {
                    void elegir(e.empresaId);
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-slate-800">
                        {e.nombreComercial}
                      </span>
                      {/* El rol cambia POR empresa (ADR-011): la misma persona
                          puede ser admin en una y solo-lectura en otra, así que
                          verlo antes de entrar evita elegir a ciegas. */}
                      {activa && (
                        <span className="shrink-0 rounded-full bg-marca-100 px-2 py-0.5 text-[11px] text-marca-700">
                          activa
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {ROL_LEGIBLE[e.rol] ?? e.rol}
                    </div>
                  </div>
                  <span className="ml-3 shrink-0 text-marca-600">
                    {cargando === e.empresaId ? '…' : '→'}
                  </span>
                </button>
              </Tarjeta>
            );
          })}
        </div>

        {/* Sin esto, entrar a "cambiar" y arrepentirse deja al usuario atrapado:
            esta pantalla vive fuera del Shell y no tiene barra de navegación. */}
        {hayActiva && (
          <button
            className="mt-6 w-full text-center text-sm text-slate-500 hover:text-slate-700"
            onClick={() => {
              void navigate(-1);
            }}
          >
            ← Volver sin cambiar
          </button>
        )}
      </div>
    </div>
  );
}
