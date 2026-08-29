import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type PlanillaLinea } from '../lib/api';
import { Boton, Tarjeta } from '../components/ui';
import { MovimientosPanel } from './MovimientosPanel';
import { InspectionDrawer } from '../components/InspectionDrawer';
import { useAuth } from '../lib/auth';

const COLOR: Record<string, string> = {
  borrador: 'bg-slate-100 text-slate-600',
  calculada: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-amber-100 text-amber-700',
  cerrada: 'bg-green-100 text-green-700',
};

export function PlanillaDetalle({ id, onVolver }: { id: string; onVolver: () => void }) {
  const qc = useQueryClient();
  const { puede } = useAuth();
  /** Línea abierta en el Inspection Drawer (ADR-005). */
  const [inspeccion, setInspeccion] = useState<{ linea: PlanillaLinea; colaborador: string } | null>(
    null,
  );
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
  const editable = data.estado === 'borrador' || data.estado === 'calculada';

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
        {/*
          Cada acción depende de DOS cosas: el estado de la máquina y el
          permiso del rol (ADR-018). Quien calcula no aprueba, así que un
          operador de nómina ve "Calcular" pero no ve "Aprobar" — y no porque
          se le esconda un botón que igual funcionaría, sino porque el
          servidor lo va a rechazar de todos modos.
        */}
        <div className="flex gap-2">
          {editable && puede('planilla:calcular') && (
            <Boton onClick={() => calcular.mutate()} disabled={pendiente}>
              {data.estado === 'borrador' ? 'Calcular' : 'Recalcular'}
            </Boton>
          )}
          {data.estado === 'calculada' && puede('planilla:aprobar') && (
            <Boton variante="secundario" onClick={() => aprobar.mutate()} disabled={pendiente}>
              Aprobar
            </Boton>
          )}
          {data.estado === 'aprobada' && puede('planilla:cerrar') && (
            <Boton onClick={() => cerrar.mutate()} disabled={pendiente}>
              Cerrar planilla
            </Boton>
          )}
        </div>
      </div>

      {errorMut && <p className="mb-4 text-sm text-red-600">{errorMut.message}</p>}

      {/*
        Si la planilla está lista para el siguiente paso pero este rol no puede
        darlo, se dice. Sin esto la pantalla se ve idéntica a "no hay nada que
        hacer" y el usuario se queda esperando sin saber a quién buscar.
      */}
      {data.estado === 'calculada' && !puede('planilla:aprobar') && (
        <p className="mb-4 rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-500">
          Esta planilla está calculada y espera aprobación. Tu rol no aprueba planillas —
          separación de funciones: quien calcula no aprueba.
        </p>
      )}
      {data.estado === 'aprobada' && !puede('planilla:cerrar') && (
        <p className="mb-4 rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-500">
          Aprobada y pendiente de cierre. Tu rol no cierra planillas.
        </p>
      )}

      {/* Capturar insumos es escritura: sin el permiso no se muestra el panel. */}
      {editable && data.tipo !== 'xiii' && puede('movimiento:escribir') && (
        <MovimientosPanel
          planillaId={id}
          fechaPeriodo={data.periodoHasta}
          onCambio={invalidar}
        />
      )}

      {/* XIII Mes: no hay insumos que capturar. La partida se reconstruye de lo
          ya percibido en la ventana que fija el Decreto 221 de 1971. */}
      {t?.partida && (
        <div className="mb-6 rounded-xl border border-marca-200 bg-marca-50 p-4 text-sm text-slate-700">
          <b>
            {t.partida.numero}.<sup>a</sup> partida del XIII Mes
          </b>{' '}
          — acumulada sobre lo percibido entre <b>{t.partida.ventanaDesde}</b> y{' '}
          <b>{t.partida.ventanaHasta}</b>, dividida entre {t.partida.divisor}.
          <div className="mt-1 text-xs text-slate-500">{t.partida.baseLegal}</div>
        </div>
      )}

      {/* Hallazgos que cambian el monto: aguinaldo que sustituyo a la partida,
          ventana distinta de la escrita. Nunca se resuelven en silencio. */}
      {t?.advertencias && t.advertencias.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <b>Reglas aplicadas a favor del trabajador</b>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {t.advertencias.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Hueco declarado, no omitido: la cuota patronal sobre el XIII no esta
          determinada (consulta A7), asi que esta planilla no reporta costo. */}
      {t?.cuotaPatronal && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <b>Cuota patronal sobre el XIII: no determinada.</b>{' '}
          <span className="text-xs text-slate-400">{t.cuotaPatronal.nota}</span>
        </div>
      )}

      {/* Honestidad sobre el estado de la investigacion legal: el calculo uso
          conceptos cuya incidencia todavia nadie confirmo. */}
      {t?.conceptosPendientes && t.conceptosPendientes.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <b>Calculo provisional.</b> Usa {t.conceptosPendientes.length} concepto
          {t.conceptosPendientes.length === 1 ? '' : 's'} con incidencia sin verificar:{' '}
          <span className="font-mono text-xs">{t.conceptosPendientes.join(', ')}</span>. Quedan
          sujetos a la respuesta del asesor laboral (Bloque B1 del cuestionario).
        </div>
      )}

      {t && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi titulo="Colaboradores" valor={String(t.colaboradores ?? 0)} plano />
          <Kpi titulo="Bruto" valor={t.bruto ?? '0'} />
          <Kpi titulo="Deducciones obrero" valor={t.deduccionesObrero ?? '0'} />
          <Kpi titulo="Neto a pagar" valor={t.neto ?? t.netoAntesIsr ?? '0'} />
          <Kpi
            titulo="Costo empleador"
            valor={t.costoEmpleador ?? 'no determinado'}
            plano={t.costoEmpleador == null}
            destacado
          />
        </div>
      )}

      {/* Método de retención de ISR: la ley no lo prescribe (consulta A1),
          Nomix eligió el acumulativo (ADR-014). Se muestra siempre visible,
          no como advertencia — es una decisión de producto, no un hueco. */}
      {t?.isr && Number(t.isr.retenido) > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <b>ISR — método acumulativo:</b> B/. {t.isr.retenido} retenidos en este período.{' '}
          <span className="text-xs text-slate-400">{t.isr.nota}</span>
        </div>
      )}

      {data.colaboradores.length === 0 ? (
        <Tarjeta className="text-center text-slate-500">
          Sin líneas todavía. Presiona <b>Calcular</b> para procesar
          {data.tipo === 'xiii'
            ? ' sobre lo percibido en la ventana de la partida.'
            : ' sobre los colaboradores activos.'}
        </Tarjeta>
      ) : (
        <div className="space-y-4">
          {data.colaboradores.map((c) => (
            <FichaColaborador
              key={c.colaboradorId}
              nombre={c.nombre}
              lineas={c.lineas}
              onInspeccionar={(l) => {
                setInspeccion({ linea: l, colaborador: c.nombre });
              }}
            />
          ))}
        </div>
      )}

      <InspectionDrawer
        linea={inspeccion?.linea ?? null}
        colaborador={inspeccion?.colaborador ?? ''}
        onCerrar={() => {
          setInspeccion(null);
        }}
      />
    </div>
  );
}

/**
 * Desglose de un colaborador.
 *
 * Las tres clases de línea NO se mezclan en una sola tabla. Antes sí, y el
 * resultado se prestaba a leer el aporte patronal como si el trabajador lo
 * pagara o como si engrosara la planilla: son cifras del MISMO tamaño, en la
 * MISMA columna, y nada decía que unas se restan del sueldo y otras no.
 *
 * Aquí el cuerpo de la tarjeta es lo que le pasa al colaborador —lo que gana,
 * lo que se le retiene y lo que recibe—, y el costo del empleador va aparte,
 * plegado y rotulado como lo que es: dinero que paga la empresa ADEMÁS del
 * salario, y que no toca el neto.
 */
function FichaColaborador({
  nombre,
  lineas,
  onInspeccionar,
}: {
  nombre: string;
  lineas: PlanillaLinea[];
  onInspeccionar: (l: PlanillaLinea) => void;
}) {
  const [verPatronal, setVerPatronal] = useState(false);
  const fmtLinea = (m: string) => Number(m).toFixed(2);

  const delTrabajador = lineas.filter((l) => l.tipo !== 'aporte_patronal');
  const patronales = lineas.filter((l) => l.tipo === 'aporte_patronal');

  // El neto por persona no estaba en ninguna parte: solo el total de la
  // planilla. Es la cifra que el colaborador va a comparar con su depósito.
  const neto = delTrabajador.reduce(
    (acc, l) => (l.tipo === 'deduccion' ? acc - Number(l.monto) : acc + Number(l.monto)),
    0,
  );
  const costoPatronal = patronales.reduce((acc, l) => acc + Number(l.monto), 0);

  const fila = (l: PlanillaLinea, i: number) => (
    <tr
      key={i}
      onClick={() => {
        onInspeccionar(l);
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onInspeccionar(l);
        }
      }}
      title="Ver por qué esta cifra"
      className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
    >
      <td className="py-1.5 text-slate-600">
        {l.concepto}
        {/* Una línea sin rastro se marca en la propia tabla: si hay que
            buscarla abriendo una por una, nadie la ve. */}
        {!l.traza && (
          <span className="ml-2 text-xs text-amber-600" title="Sin traza">
            ⚠
          </span>
        )}
      </td>
      <td className="py-1.5 text-xs text-slate-400">
        {l.tipo}
        {l.cantidad && ` · ${Number(l.cantidad).toString()}`}
      </td>
      <td
        className={`py-1.5 text-right tabular-nums ${
          l.tipo === 'deduccion' ? 'text-red-600' : 'text-slate-800'
        }`}
      >
        {l.tipo === 'deduccion' ? '−' : ''}
        {fmtLinea(l.monto)}
      </td>
    </tr>
  );

  return (
    <Tarjeta>
      <h3 className="mb-3 font-semibold text-slate-800">{nombre}</h3>

      <table className="w-full text-sm">
        <tbody>{delTrabajador.map(fila)}</tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200">
            <td className="pt-2 font-semibold text-slate-700" colSpan={2}>
              Neto a pagar
            </td>
            <td className="pt-2 text-right font-semibold tabular-nums text-slate-900">
              {neto.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      {patronales.length > 0 && (
        <div className="mt-4 border-t border-dashed border-slate-200 pt-3">
          <button
            onClick={() => {
              setVerPatronal((v) => !v);
            }}
            className="flex w-full items-center justify-between text-left text-xs text-slate-400 hover:text-slate-600"
            aria-expanded={verPatronal}
          >
            <span>
              {verPatronal ? '▾' : '▸'} Costo del empleador · no se descuenta al colaborador
            </span>
            <span className="tabular-nums">+{costoPatronal.toFixed(2)}</span>
          </button>
          {verPatronal && (
            <>
              <p className="mt-2 text-xs text-slate-400">
                Aportes que paga la empresa <b>además</b> del salario (CSS patronal, seguro
                educativo, riesgos profesionales). No entran en el bruto ni en el neto de arriba.
              </p>
              <table className="mt-1 w-full text-sm opacity-75">
                <tbody>{patronales.map(fila)}</tbody>
              </table>
            </>
          )}
        </div>
      )}
    </Tarjeta>
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
