import { sql } from 'drizzle-orm';
import { Money, calcularIsrAcumulativo, type Tramo, type LineaCalculada } from '@nomix/payroll-engine';
import type { TenantTx } from '../db/tenant.js';
import { resolverTramos } from '../rules/rule-resolver.js';

/**
 * ISR — método acumulativo (ADR-014, base legal §4.5). Ver el porqué de la
 * elección y la mecánica en `packages/payroll-engine/src/planilla/isr.ts`.
 *
 * Esta capa hace lo que el motor puro no puede: leer el histórico del año.
 * Sumar la columna `base` de las líneas `isr_retencion` de períodos anteriores
 * reconstruye el acumulado sin guardar una cifra "acumulada" aparte que se
 * volvería incorrecta si un período anterior se recalcula.
 */

interface AcumuladoAnterior {
  readonly baseAcumulada: Money;
  readonly retenidoAcumulado: Money;
}

async function sumarHistorico(
  tx: TenantTx,
  colaboradorId: string,
  conceptoCodigo: string,
  anio: string,
  planillaIdActual: string,
): Promise<AcumuladoAnterior> {
  const filas = await tx.execute(sql`
    select
      coalesce(sum(d.base), 0)::text as base,
      coalesce(sum(d.monto), 0)::text as monto
    from planilla_detalle d
    join planilla_cabecera c on c.id = d.planilla_id
    where d.colaborador_id = ${colaboradorId}
      and d.concepto_codigo = ${conceptoCodigo}
      and extract(year from c.periodo_hasta)::text = ${anio}
      and d.planilla_id <> ${planillaIdActual}
  `);
  const r = (filas as unknown as ReadonlyArray<{ base: string; monto: string }>)[0];
  return {
    baseAcumulada: Money.of(r?.base ?? '0'),
    retenidoAcumulado: Money.of(r?.monto ?? '0'),
  };
}

export interface TramosIsr {
  readonly ordinario: readonly Tramo[];
  readonly gastosRepresentacion: readonly Tramo[];
}

export async function resolverTramosIsr(tx: TenantTx, fecha: string): Promise<TramosIsr> {
  const [ordinario, gastosRepresentacion] = await Promise.all([
    resolverTramos(tx, 'isr_tramos', fecha),
    resolverTramos(tx, 'isr_gastos_representacion_tramos', fecha),
  ]);
  return { ordinario, gastosRepresentacion };
}

/**
 * Calcula la retención de ISR de ESTE período para un colaborador, en los dos
 * flujos paralelos que exige el Formulario 03 (ordinario y gastos de
 * representación — doc 09 §2). Cada uno se acumula por separado porque cada
 * uno tiene su propia escala.
 *
 * Devuelve solo las líneas con base > 0 en alguno de los dos flujos; un
 * colaborador sin gastos de representación no genera una línea vacía de ese
 * concepto (si nunca los tuvo, no hay nada que rastrear).
 */
export async function calcularRetencionesIsr(
  tx: TenantTx,
  colaboradorId: string,
  planillaId: string,
  fecha: string,
  baseOrdinariaPeriodo: Money,
  baseGastosRepresentacionPeriodo: Money,
): Promise<LineaCalculada[]> {
  const anio = fecha.slice(0, 4);
  const tramos = await resolverTramosIsr(tx, fecha);
  const lineas: LineaCalculada[] = [];

  if (!baseOrdinariaPeriodo.isZero()) {
    const anterior = await sumarHistorico(tx, colaboradorId, 'isr_retencion', anio, planillaId);
    lineas.push(
      calcularIsrAcumulativo({
        baseGravablePeriodo: baseOrdinariaPeriodo,
        baseGravableAcumuladaAnterior: anterior.baseAcumulada,
        retenidoAcumuladoAnterior: anterior.retenidoAcumulado,
        // Nomix no captura hoy deducciones personales anuales (gastos médicos,
        // intereses hipotecarios...) — no hay campo en la ficha del
        // colaborador. La deducción básica de B/.800 no aplica aquí: es de la
        // declaración conjunta anual, no de la retención de planilla (base
        // legal §4.2). Ver ADR-014.
        deduccionesPersonalesAnuales: Money.ZERO,
        tramos: tramos.ordinario,
        concepto: 'isr_retencion',
        baseLegal: 'Art. 700 CF — método acumulativo (ADR-014)',
      }),
    );
  }

  if (!baseGastosRepresentacionPeriodo.isZero()) {
    const anteriorGR = await sumarHistorico(
      tx,
      colaboradorId,
      'isr_retencion_gastos_representacion',
      anio,
      planillaId,
    );
    lineas.push(
      calcularIsrAcumulativo({
        baseGravablePeriodo: baseGastosRepresentacionPeriodo,
        baseGravableAcumuladaAnterior: anteriorGR.baseAcumulada,
        retenidoAcumuladoAnterior: anteriorGR.retenidoAcumulado,
        deduccionesPersonalesAnuales: Money.ZERO,
        tramos: tramos.gastosRepresentacion,
        concepto: 'isr_retencion_gastos_representacion',
        baseLegal: 'Art. 701 lit. l CF (Ley 8 de 2010) — método acumulativo (ADR-014)',
      }),
    );
  }

  return lineas;
}
