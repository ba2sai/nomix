import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type CicloVacaciones, type CrearMovimiento } from '../lib/api';
import { Boton, Campo, Selector, Tarjeta } from '../components/ui';

/**
 * Captura del devengado variable del período: horas extra, comisiones,
 * ausencias, descuentos. Es el insumo que consume `Calcular`.
 *
 * El formulario se adapta a la UNIDAD que declara el concepto en el catálogo
 * (ADR-002): por horas, por días o por monto. Así un concepto nuevo aparece
 * aquí sin tocar el frontend.
 */
export function MovimientosPanel({
  planillaId,
  fechaPeriodo,
  onCambio,
}: {
  planillaId: string;
  fechaPeriodo: string;
  onCambio: () => Promise<void>;
}) {
  const qc = useQueryClient();
  const conceptos = useQuery({
    queryKey: ['conceptos', fechaPeriodo],
    queryFn: () => api.conceptos(fechaPeriodo),
  });
  const colaboradores = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => api.colaboradores(),
  });
  const movimientos = useQuery({
    queryKey: ['movimientos', planillaId],
    queryFn: () => api.movimientos(planillaId),
  });

  const [colaboradorId, setColaboradorId] = useState('');
  const [conceptoCodigo, setConceptoCodigo] = useState('');
  const [valor, setValor] = useState('');
  const [nota, setNota] = useState('');
  const [ciclo, setCiclo] = useState<CicloVacaciones | null>(null);

  const refrescar = async () => {
    await qc.invalidateQueries({ queryKey: ['movimientos', planillaId] });
    await onCambio();
  };
  const crear = useMutation({
    mutationFn: (dto: CrearMovimiento) => api.crearMovimiento(planillaId, dto),
    onSuccess: async () => {
      setValor('');
      setNota('');
      await refrescar();
    },
  });
  const eliminar = useMutation({
    mutationFn: (movId: string) => api.eliminarMovimiento(planillaId, movId),
    onSuccess: refrescar,
  });
  const calcularVacaciones = useMutation({
    mutationFn: () => api.calcularVacaciones(planillaId, colaboradorId),
    onSuccess: (r) => {
      setCiclo(r);
      setValor(r.linea.monto);
    },
  });

  // Solo se capturan ingresos y deducciones; los aportes patronales los produce
  // el motor y no se teclean.
  const capturables = (conceptos.data ?? []).filter(
    (c) => c.tipo === 'ingreso' || c.tipo === 'deduccion',
  );
  const seleccionado = capturables.find((c) => c.codigo === conceptoCodigo);
  const nombreConcepto = (codigo: string) =>
    conceptos.data?.find((c) => c.codigo === codigo)?.nombre ?? codigo;
  const nombreColaborador = (id: string) => {
    const c = colaboradores.data?.find((x) => x.id === id);
    return c ? `${c.nombres} ${c.apellidos}` : id;
  };

  const etiquetaValor =
    seleccionado?.unidad === 'horas'
      ? 'Horas'
      : seleccionado?.unidad === 'dias'
        ? 'Días'
        : 'Monto (B/.)';

  const enviar = () => {
    if (!colaboradorId || !seleccionado || !valor) return;
    const dto: CrearMovimiento = { colaboradorId, conceptoCodigo };
    if (seleccionado.unidad === 'monto') dto.monto = valor;
    else dto.cantidad = valor;
    if (nota) dto.nota = nota;
    crear.mutate(dto);
  };

  return (
    <Tarjeta className="mb-6">
      <h3 className="mb-1 font-semibold text-slate-800">Movimientos del período</h3>
      <p className="mb-4 text-xs text-slate-500">
        Horas extra, comisiones, ausencias y descuentos. Se aplican al recalcular.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Selector
          etiqueta="Colaborador"
          value={colaboradorId}
          onChange={(e) => {
            setColaboradorId(e.target.value);
            setCiclo(null);
          }}
        >
          <option value="">Selecciona…</option>
          {(colaboradores.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombres} {c.apellidos}
            </option>
          ))}
        </Selector>

        <Selector
          etiqueta="Concepto"
          value={conceptoCodigo}
          onChange={(e) => {
            setConceptoCodigo(e.target.value);
            setValor('');
            setCiclo(null);
          }}
        >
          <option value="">Selecciona…</option>
          {capturables.map((c) => (
            <option key={c.codigo} value={c.codigo}>
              {c.nombre}
              {c.confianza === 'verificado' ? '' : ' ⚠'}
            </option>
          ))}
        </Selector>

        <Campo
          etiqueta={etiquetaValor}
          type="text"
          inputMode="decimal"
          value={valor}
          disabled={!seleccionado}
          onChange={(e) => {
            setValor(e.target.value);
          }}
          placeholder={seleccionado?.unidad === 'monto' ? '0.00' : '0'}
        />

        <Campo
          etiqueta="Nota (opcional)"
          type="text"
          value={nota}
          onChange={(e) => {
            setNota(e.target.value);
          }}
        />

        <div className="flex items-end gap-2">
          {conceptoCodigo === 'vacaciones_pagadas' && (
            <Boton
              variante="secundario"
              onClick={() => {
                calcularVacaciones.mutate();
              }}
              disabled={!colaboradorId || calcularVacaciones.isPending}
            >
              {calcularVacaciones.isPending ? 'Calculando…' : 'Calcular automático'}
            </Boton>
          )}
          <Boton
            onClick={() => {
              enviar();
            }}
            disabled={!colaboradorId || !seleccionado || !valor || crear.isPending}
          >
            Agregar
          </Boton>
        </div>
      </div>

      {/* Ayuda de cálculo (ADR-016): sugiere el monto reconstruyendo el ciclo
          del colaborador desde su histórico. El usuario decide si lo usa. */}
      {conceptoCodigo === 'vacaciones_pagadas' && calcularVacaciones.error && (
        <p className="mt-2 text-sm text-red-600">
          {(calcularVacaciones.error as Error).message}
        </p>
      )}
      {ciclo && conceptoCodigo === 'vacaciones_pagadas' && (
        <div className="mt-3 rounded-xl border border-marca-200 bg-marca-50 p-3 text-sm text-slate-700">
          Ciclo del <b>{ciclo.ventanaDesde}</b> al <b>{ciclo.ventanaHasta}</b> — {ciclo.diasAcumulados}{' '}
          días acumulados{ciclo.cicloCompleto ? ' (ciclo completo)' : ' (ciclo parcial)'}. Monto
          sugerido: <b>B/. {ciclo.linea.monto}</b>.
          {ciclo.advertencias.length > 0 && (
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-700">
              {ciclo.advertencias.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {seleccionado && (
        <p className="mt-2 text-xs text-slate-400">
          {seleccionado.baseLegal}
          {seleccionado.confianza !== 'verificado' && (
            <span className="ml-1 text-amber-600">· incidencia sin verificar</span>
          )}
        </p>
      )}

      {crear.error && <p className="mt-2 text-sm text-red-600">{crear.error.message}</p>}
      {eliminar.error && <p className="mt-2 text-sm text-red-600">{eliminar.error.message}</p>}

      {(movimientos.data ?? []).length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-1.5">Colaborador</th>
              <th className="py-1.5">Concepto</th>
              <th className="py-1.5 text-right">Cantidad / Monto</th>
              <th className="py-1.5">Nota</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(movimientos.data ?? []).map((m) => (
              <tr key={m.id} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 text-slate-600">{nombreColaborador(m.colaboradorId)}</td>
                <td className="py-1.5 text-slate-600">{nombreConcepto(m.conceptoCodigo)}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-800">
                  {m.cantidad ?? m.monto}
                </td>
                <td className="py-1.5 text-xs text-slate-400">{m.nota}</td>
                <td className="py-1.5 text-right">
                  <button
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => {
                      eliminar.mutate(m.id);
                    }}
                    disabled={eliminar.isPending}
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Tarjeta>
  );
}
