import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Boton, Campo, Tarjeta } from '../components/ui';

export function PlanillaPreview() {
  const hoy = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(hoy);
  const [consulta, setConsulta] = useState(hoy);

  const { data, isFetching, error } = useQuery({
    queryKey: ['preview', consulta],
    queryFn: () => api.previewEmpresa(consulta),
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-800">Previsualización de planilla</h1>
      <p className="mb-6 text-sm text-slate-500">
        Cálculo de CSS y Seguro Educativo sobre los colaboradores activos, con tasas vigentes en la
        fecha del período (motor reactivo).
      </p>

      <div className="mb-6 flex items-end gap-3">
        <div className="w-48">
          <Campo etiqueta="Fecha del período" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <Boton onClick={() => setConsulta(fecha)}>Calcular</Boton>
      </div>

      {isFetching && <p className="text-slate-500">Calculando…</p>}
      {error && <p className="text-red-600">{(error as Error).message}</p>}

      {data && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(data.tasasVigentes).map(([k, v]) => (
              <span key={k} className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                {k}: <b>{v}</b>
              </span>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi titulo="Bruto" valor={data.totales.bruto} />
            <Kpi titulo="Deducciones obrero" valor={data.totales.deduccionesObrero} />
            <Kpi titulo="Cargas patronales" valor={data.totales.cargasPatronales} />
            <Kpi titulo="Costo empleador" valor={data.totales.costoEmpleador} destacado />
          </div>

          <Tarjeta className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Colaborador</th>
                  <th className="px-4 py-3 text-right font-medium">Base</th>
                  <th className="px-4 py-3 text-right font-medium">Deduc. obrero</th>
                  <th className="px-4 py-3 text-right font-medium">Neto (antes ISR)</th>
                  <th className="px-4 py-3 text-right font-medium">Costo empleador</th>
                </tr>
              </thead>
              <tbody>
                {data.colaboradores.map((c) => (
                  <tr key={c.nombre} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.nombre}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.baseCotizable}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600">
                      −{c.totalDeduccionesObrero}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{c.netoAntesIsr}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{c.costoEmpleador}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tarjeta>

          <p className="text-xs text-amber-700">⚠️ ISR pendiente: {data.pendiente.isr}</p>
        </div>
      )}
    </div>
  );
}

function Kpi({ titulo, valor, destacado }: { titulo: string; valor: string; destacado?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        destacado ? 'border-marca-200 bg-marca-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="text-xs text-slate-500">{titulo}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-slate-800">B/. {valor}</div>
    </div>
  );
}
