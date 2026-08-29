import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Planilla } from '../lib/api';
import { Boton, Campo, Selector, Tarjeta } from '../components/ui';
import { useAuth } from '../lib/auth';
import { PlanillaDetalle } from './PlanillaDetalle';

function primeraQuincena(): { desde: string; hasta: string } {
  const h = new Date();
  const y = h.getFullYear();
  const m = String(h.getMonth() + 1).padStart(2, '0');
  return { desde: `${y}-${m}-01`, hasta: `${y}-${m}-15` };
}

const COLOR: Record<string, string> = {
  borrador: 'bg-slate-100 text-slate-600',
  calculada: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-amber-100 text-amber-700',
  cerrada: 'bg-green-100 text-green-700',
};

export function Planillas() {
  const { puede } = useAuth();
  const qc = useQueryClient();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const q = primeraQuincena();
  const [form, setForm] = useState({ tipo: 'quincenal', periodoDesde: q.desde, periodoHasta: q.hasta });

  const { data, isLoading } = useQuery({ queryKey: ['planillas'], queryFn: api.planillas });
  const crear = useMutation({
    mutationFn: () => api.crearPlanilla(form),
    onSuccess: async (p) => {
      await qc.invalidateQueries({ queryKey: ['planillas'] });
      setCreando(false);
      setAbierta(p.id);
    },
  });

  if (abierta) return <PlanillaDetalle id={abierta} onVolver={() => setAbierta(null)} />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Planillas</h1>
          <p className="text-sm text-slate-500">Procesa, aprueba y cierra periodos de nómina</p>
        </div>
        {/* Abrir un período es parte de correr la nómina, no de auditarla. */}
        {puede('planilla:calcular') && (
          <Boton onClick={() => setCreando((v) => !v)}>+ Nueva planilla</Boton>
        )}
      </div>

      {creando && (
        <Tarjeta className="mb-6">
          <div className="grid items-end gap-4 sm:grid-cols-4">
            <Selector etiqueta="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="quincenal">Quincenal</option>
              <option value="bisemanal">Bisemanal</option>
              <option value="xiii">XIII Mes</option>
            </Selector>
            <Campo etiqueta="Desde" type="date" value={form.periodoDesde} onChange={(e) => setForm({ ...form, periodoDesde: e.target.value })} />
            <Campo etiqueta="Hasta" type="date" value={form.periodoHasta} onChange={(e) => setForm({ ...form, periodoHasta: e.target.value })} />
            <Boton onClick={() => crear.mutate()} disabled={crear.isPending}>
              {crear.isPending ? 'Creando…' : 'Crear'}
            </Boton>
          </div>
          {form.tipo === 'xiii' && (
            <p className="mt-3 text-sm text-slate-500">
              La ventana de acumulacion la fija el Decreto 221 de 1971 a partir de la fecha{' '}
              <b>Hasta</b>: 15 de abril, 15 de agosto o 15 de diciembre. Si escribes otras fechas,
              Nomix calcula sobre la ventana legal y lo advierte en el resultado.
            </p>
          )}
          {crear.isError && <p className="mt-3 text-sm text-red-600">{(crear.error as Error).message}</p>}
        </Tarjeta>
      )}

      {isLoading && <p className="text-slate-500">Cargando…</p>}
      {data && data.length === 0 && (
        <Tarjeta className="text-center text-slate-500">No hay planillas. Crea la primera.</Tarjeta>
      )}
      {data && data.length > 0 && (
        <Tarjeta className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Periodo</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 text-right font-medium">Bruto</th>
                <th className="px-4 py-3 text-right font-medium">Costo empleador</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((p: Planilla) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {p.periodoDesde} → {p.periodoHasta}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.tipo}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.totales?.bruto ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                    {p.totales?.costoEmpleador ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${COLOR[p.estado] ?? ''}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-marca-600 hover:underline" onClick={() => setAbierta(p.id)}>
                      abrir →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tarjeta>
      )}
    </div>
  );
}
