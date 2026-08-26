import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Boton, Tarjeta } from '../components/ui';

const COLOR: Record<string, string> = {
  borrador: 'bg-slate-100 text-slate-600',
  calculada: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-amber-100 text-amber-700',
  cerrada: 'bg-green-100 text-green-700',
};

export function PlanillaDetalle({ id, onVolver }: { id: string; onVolver: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['planilla', id], queryFn: () => api.planilla(id) });

  const invalidar = async () => {
    await qc.invalidateQueries({ queryKey: ['planilla', id] });
    await qc.invalidateQueries({ queryKey: ['planillas'] });
  };
  const calcular = useMutation({ mutationFn: () => api.calcularPlanilla(id), onSuccess: invalidar });
  const aprobar = useMutation({ mutationFn: () => api.aprobarPlanilla(id), onSuccess: invalidar });
  const cerrar = useMutation({ mutationFn: () => api.cerrarPlanilla(id), onSuccess: invalidar });
  const pendiente = calcular.isPending || aprobar.isPending || cerrar.isPending;
  const errorMut =
    (calcular.error as Error | null) ?? (aprobar.error as Error | null) ?? (cerrar.error as Error | null);

  if (isLoading || !data) return <p className="text-slate-500">Cargando…</p>;

  const t = data.totales;
  const fmtLinea = (m: string) => Number(m).toFixed(2);

  return (
    <div>
      <button className="mb-4 text-sm text-marca-600 hover:underline" onClick={onVolver}>
        ← Volver a planillas
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Planilla {data.periodoDesde} → {data.periodoHasta}
          </h1>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${COLOR[data.estado] ?? ''}`}>
            {data.estado}
          </span>
        </div>
        <div className="flex gap-2">
          {(data.estado === 'borrador' || data.estado === 'calculada') && (
            <Boton onClick={() => calcular.mutate()} disabled={pendiente}>
              {data.estado === 'borrador' ? 'Calcular' : 'Recalcular'}
            </Boton>
          )}
          {data.estado === 'calculada' && (
            <Boton variante="secundario" onClick={() => aprobar.mutate()} disabled={pendiente}>
              Aprobar
            </Boton>
          )}
          {data.estado === 'aprobada' && (
            <Boton onClick={() => cerrar.mutate()} disabled={pendiente}>
              Cerrar planilla
            </Boton>
          )}
        </div>
      </div>

      {errorMut && <p className="mb-4 text-sm text-red-600">{errorMut.message}</p>}

      {t && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi titulo="Colaboradores" valor={String(t.colaboradores ?? 0)} plano />
          <Kpi titulo="Bruto" valor={t.bruto ?? '0'} />
          <Kpi titulo="Deducciones obrero" valor={t.deduccionesObrero ?? '0'} />
          <Kpi titulo="Costo empleador" valor={t.costoEmpleador ?? '0'} destacado />
        </div>
      )}

      {data.colaboradores.length === 0 ? (
        <Tarjeta className="text-center text-slate-500">
          Sin líneas todavía. Presiona <b>Calcular</b> para procesar sobre los colaboradores activos.
        </Tarjeta>
      ) : (
        <div className="space-y-4">
          {data.colaboradores.map((c) => (
            <Tarjeta key={c.colaboradorId}>
              <h3 className="mb-3 font-semibold text-slate-800">{c.nombre}</h3>
              <table className="w-full text-sm">
                <tbody>
                  {c.lineas.map((l, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5 text-slate-600">{l.concepto}</td>
                      <td className="py-1.5 text-xs text-slate-400">{l.tipo}</td>
                      <td
                        className={`py-1.5 text-right tabular-nums ${
                          l.tipo === 'deduccion' ? 'text-red-600' : 'text-slate-800'
                        }`}
                      >
                        {l.tipo === 'deduccion' ? '−' : ''}
                        {fmtLinea(l.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Tarjeta>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({
  titulo,
  valor,
  destacado,
  plano,
}: {
  titulo: string;
  valor: string;
  destacado?: boolean;
  plano?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${destacado ? 'border-marca-200 bg-marca-50' : 'border-slate-200 bg-white'}`}>
      <div className="text-xs text-slate-500">{titulo}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-slate-800">
        {plano ? valor : `B/. ${valor}`}
      </div>
    </div>
  );
}
