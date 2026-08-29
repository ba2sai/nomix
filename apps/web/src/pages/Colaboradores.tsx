import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Boton, Tarjeta } from '../components/ui';
import { useAuth } from '../lib/auth';

export function Colaboradores() {
  const { puede } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: api.colaboradores,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Colaboradores</h1>
          <p className="text-sm text-slate-500">Ficha del personal de la empresa</p>
        </div>
        {/* El alta es escritura: un contador/auditor entra a ver, no a dar de alta. */}
        {puede('colaborador:escribir') && (
          <Link to="/colaboradores/nuevo">
            <Boton>+ Nuevo colaborador</Boton>
          </Link>
        )}
      </div>

      {isLoading && <p className="text-slate-500">Cargando…</p>}
      {error && <p className="text-red-600">{error.message}</p>}

      {data && data.length === 0 && (
        <Tarjeta className="text-center text-slate-500">
          Aún no hay colaboradores. Crea el primero con el wizard.
        </Tarjeta>
      )}

      {data && data.length > 0 && (
        <Tarjeta className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Cargo</th>
                <th className="px-4 py-3 font-medium">Cédula</th>
                <th className="px-4 py-3 text-right font-medium">Salario</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  {/* La fila entera abre la ficha — no es necesaria una columna
                      "acciones" aparte para lo que hoy es la única acción. */}
                  <td className="px-4 py-3 font-mono text-slate-600">
                    <Link to={`/colaboradores/${c.id}`} className="block">
                      {c.codEmpleado}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link to={`/colaboradores/${c.id}`} className="block hover:text-marca-700 hover:underline">
                      {c.nombres} {c.apellidos}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.cargo ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{c.identificacion}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(c.salarioMensual).toLocaleString('es-PA', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        c.status === 'activo'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.status}
                    </span>
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
