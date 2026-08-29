import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type CrearConceptoColaborador } from '../lib/api';
import { Boton, Campo, Selector, Tarjeta } from '../components/ui';

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Pestaña "Conceptos fijos" de la ficha del colaborador: asignaciones
 * recurrentes (gastos de representación, dietas, descuentos directos) que no
 * dependen de capturarse período a período, a diferencia de los movimientos
 * de `MovimientosPanel`. Se materializan solas como movimiento en cada
 * planilla nueva (`ADR-021`).
 *
 * Dos reglas del backend que la UI tiene que respetar, no solo tolerar:
 *
 * 1. **La unidad la manda el catálogo, no el formulario.** Igual que en
 *    `MovimientosPanel`, un concepto de horas o días se captura por
 *    `cantidad`; uno de monto, por `monto`. Nunca los dos.
 * 2. **"Quitar" no borra, cierra.** `DELETE` fija `vigenteHasta`: las
 *    planillas ya calculadas se apoyaron en que el concepto estaba vigente
 *    (`ADR-001`), así que borrar la fila reescribiría el pasado. El botón
 *    dice "Cerrar", no "Quitar", y pide la fecha de cierre.
 */
export function ConceptosColaboradorPanel({
  colaboradorId,
  soloLectura,
}: {
  colaboradorId: string;
  soloLectura: boolean;
}) {
  const qc = useQueryClient();
  const [vigenteDesde, setVigenteDesde] = useState(hoy());
  const [vigenteHasta, setVigenteHasta] = useState('');
  const [conceptoCodigo, setConceptoCodigo] = useState('');
  const [valor, setValor] = useState('');
  const [nota, setNota] = useState('');
  // Fila cuya fecha de cierre se está editando (null = ninguna).
  const [cerrando, setCerrando] = useState<string | null>(null);
  const [fechaCierre, setFechaCierre] = useState(hoy());

  // El catálogo se resuelve por fecha (ADR-001): la vigencia que importa es la
  // que el usuario está fijando como inicio del concepto fijo, no "hoy" a secas.
  const catalogo = useQuery({
    queryKey: ['conceptos', vigenteDesde],
    queryFn: () => api.conceptos(vigenteDesde),
    enabled: !!vigenteDesde,
  });
  const conceptosFijos = useQuery({
    queryKey: ['colaborador-conceptos', colaboradorId],
    queryFn: () => api.conceptosColaborador(colaboradorId),
  });

  const invalidar = async () => {
    await qc.invalidateQueries({ queryKey: ['colaborador-conceptos', colaboradorId] });
  };
  const crear = useMutation({
    mutationFn: (dto: CrearConceptoColaborador) => api.crearConceptoColaborador(colaboradorId, dto),
    onSuccess: async () => {
      setConceptoCodigo('');
      setValor('');
      setNota('');
      await invalidar();
    },
  });
  const cerrar = useMutation({
    mutationFn: (vars: { conceptoId: string; hasta: string }) =>
      api.cerrarConceptoColaborador(colaboradorId, vars.conceptoId, vars.hasta),
    onSuccess: async () => {
      setCerrando(null);
      await invalidar();
    },
  });

  // Solo ingresos y deducciones se asignan como concepto fijo; los aportes
  // patronales y provisiones los produce el motor, no se capturan.
  const capturables = (catalogo.data ?? []).filter((c) => c.tipo === 'ingreso' || c.tipo === 'deduccion');
  const seleccionado = capturables.find((c) => c.codigo === conceptoCodigo);
  const nombreConcepto = (codigo: string) =>
    catalogo.data?.find((c) => c.codigo === codigo)?.nombre ?? codigo;

  const etiquetaValor =
    seleccionado?.unidad === 'horas' ? 'Horas' : seleccionado?.unidad === 'dias' ? 'Días' : 'Monto (B/.)';

  const enviar = () => {
    if (!conceptoCodigo || !seleccionado || !valor || !vigenteDesde) return;
    const dto: CrearConceptoColaborador = { conceptoCodigo, vigenteDesde };
    if (seleccionado.unidad === 'monto') dto.monto = valor;
    else dto.cantidad = valor;
    if (vigenteHasta) dto.vigenteHasta = vigenteHasta;
    if (nota) dto.nota = nota;
    crear.mutate(dto);
  };

  return (
    <Tarjeta>
      <h3 className="mb-1 font-semibold text-slate-800">Conceptos fijos</h3>
      <p className="mb-4 text-xs text-slate-500">
        Asignaciones recurrentes del colaborador — gastos de representación, dietas, descuentos
        directos — que se aplican en cada período sin volver a capturarlas.
      </p>

      {!soloLectura && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Selector
            etiqueta="Concepto"
            value={conceptoCodigo}
            onChange={(e) => {
              setConceptoCodigo(e.target.value);
              setValor('');
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
            etiqueta="Vigente desde"
            type="date"
            value={vigenteDesde}
            onChange={(e) => {
              setVigenteDesde(e.target.value);
            }}
          />

          <Campo
            etiqueta="Vigente hasta (opcional)"
            type="date"
            value={vigenteHasta}
            onChange={(e) => {
              setVigenteHasta(e.target.value);
            }}
          />

          <Campo
            etiqueta="Nota (opcional)"
            type="text"
            value={nota}
            onChange={(e) => {
              setNota(e.target.value);
            }}
          />

          <div className="sm:col-span-2 lg:col-span-5">
            <Boton
              onClick={() => {
                enviar();
              }}
              disabled={!conceptoCodigo || !seleccionado || !valor || !vigenteDesde || crear.isPending}
            >
              {crear.isPending ? 'Agregando…' : 'Agregar concepto fijo'}
            </Boton>
          </div>
        </div>
      )}

      {seleccionado && (
        <p className="mb-3 text-xs text-slate-400">
          {seleccionado.baseLegal}
          {seleccionado.confianza !== 'verificado' && (
            <span className="ml-1 text-amber-600">· incidencia sin verificar</span>
          )}
        </p>
      )}

      {crear.isError && <p className="mb-2 text-sm text-red-600">{crear.error.message}</p>}
      {cerrar.isError && <p className="mb-2 text-sm text-red-600">{cerrar.error.message}</p>}

      {conceptosFijos.isLoading && <p className="text-sm text-slate-500">Cargando conceptos fijos…</p>}
      {conceptosFijos.isError && (
        <p className="text-sm text-red-600">{conceptosFijos.error.message}</p>
      )}

      {conceptosFijos.data && conceptosFijos.data.length === 0 && (
        <p className="text-sm text-slate-500">Sin conceptos fijos asignados todavía.</p>
      )}

      {conceptosFijos.data && conceptosFijos.data.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-1.5">Concepto</th>
              <th className="py-1.5 text-right">Monto / Cantidad</th>
              <th className="py-1.5">Vigencia</th>
              <th className="py-1.5">Nota</th>
              {!soloLectura && <th />}
            </tr>
          </thead>
          <tbody>
            {conceptosFijos.data.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 text-slate-600">{nombreConcepto(c.conceptoCodigo)}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-800">
                  {c.monto !== null
                    ? `B/. ${Number(c.monto).toFixed(2)}`
                    : c.cantidad !== null
                      ? Number(c.cantidad).toString()
                      : '—'}
                </td>
                <td className="py-1.5 text-xs text-slate-500">
                  {c.vigenteDesde} → {c.vigenteHasta ?? 'indefinido'}
                </td>
                <td className="py-1.5 text-xs text-slate-400">{c.nota}</td>
                {!soloLectura && (
                  <td className="py-1.5 text-right">
                    {c.vigenteHasta ? (
                      <span className="text-xs text-slate-400">cerrado</span>
                    ) : cerrando === c.id ? (
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="date"
                          value={fechaCierre}
                          min={c.vigenteDesde}
                          onChange={(e) => {
                            setFechaCierre(e.target.value);
                          }}
                          className="rounded-md border border-slate-300 px-1.5 py-0.5 text-xs"
                        />
                        <button
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => {
                            cerrar.mutate({ conceptoId: c.id, hasta: fechaCierre });
                          }}
                          disabled={cerrar.isPending}
                        >
                          Confirmar
                        </button>
                        <button
                          className="text-xs text-slate-400 hover:underline"
                          onClick={() => {
                            setCerrando(null);
                          }}
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => {
                          setCerrando(c.id);
                          setFechaCierre(hoy());
                        }}
                        title="Cierra la vigencia; no borra el histórico"
                      >
                        Cerrar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Tarjeta>
  );
}
