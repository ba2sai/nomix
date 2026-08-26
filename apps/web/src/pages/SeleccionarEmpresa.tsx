import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Tarjeta } from '../components/ui';

export function SeleccionarEmpresa() {
  const { me, seleccionarEmpresa } = useAuth();
  const [cargando, setCargando] = useState<string | null>(null);

  async function elegir(id: string) {
    setCargando(id);
    try {
      await seleccionarEmpresa(id);
    } finally {
      setCargando(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-center text-xl font-bold text-slate-800">Elige una empresa</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          Gestionas {me?.empresas.length ?? 0} empresas
        </p>
        <div className="space-y-3">
          {me?.empresas.map((e) => (
            <Tarjeta key={e.empresaId}>
              <button
                className="flex w-full items-center justify-between text-left"
                disabled={cargando !== null}
                onClick={() => {
                  void elegir(e.empresaId);
                }}
              >
                <div>
                  <div className="font-semibold text-slate-800">{e.nombreComercial}</div>
                  <div className="text-xs text-slate-500">{e.rol}</div>
                </div>
                <span className="text-marca-600">{cargando === e.empresaId ? '…' : '→'}</span>
              </button>
            </Tarjeta>
          ))}
        </div>
      </div>
    </div>
  );
}
