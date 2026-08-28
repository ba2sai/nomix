import { sql } from 'drizzle-orm';
import { Money, Rate, type Tramo } from '@nomix/payroll-engine';
import type { TenantTx } from '../db/tenant.js';

/**
 * Resuelve la tasa vigente de `codigo` para `fechaPeriodo` (ADR-001).
 *
 * Se ejecuta dentro del contexto de inquilino: el RLS de `regla` ya deja ver
 * las reglas generales del país (empresa_id null) más las de la empresa activa.
 * `order by empresa_id nulls last` prefiere el override de la empresa (convenio
 * colectivo) sobre la regla general cuando ambas coexisten.
 *
 * La fecha es la del PERÍODO que se calcula, no la de hoy: recalcular una
 * planilla de 2024 resuelve las tasas de 2024.
 */
export async function resolverTasa(
  tx: TenantTx,
  codigo: string,
  fechaPeriodo: string,
): Promise<string> {
  const filas = await tx.execute(sql`
    select valor->>'tasa' as tasa
    from regla
    where codigo = ${codigo}
      and jurisdiccion_id = 'PA'
      and vigente_desde <= ${fechaPeriodo}::date
      and (vigente_hasta is null or vigente_hasta >= ${fechaPeriodo}::date)
    order by empresa_id nulls last
    limit 1
  `);
  const r = (filas as unknown as ReadonlyArray<{ tasa: string | null }>)[0];
  if (!r?.tasa) {
    throw new Error(`Sin regla '${codigo}' vigente en ${fechaPeriodo}`);
  }
  return r.tasa;
}

interface FilaTramo {
  hasta: string | null;
  tasa: string;
  baseFija: string;
}

/**
 * Resuelve una tabla de tramos progresivos (ISR Art. 700 CF, gastos de
 * representación Art. 701 lit. l) vigente en `fechaPeriodo`.
 *
 * A diferencia de `resolverTasa`, aquí `regla.valor` es un array JSON
 * `[{ hasta, tasa, baseFija }]` en vez de un escalar `{ tasa }` — la misma
 * columna `jsonb`, distinta forma según lo que declara el código de regla.
 */
export async function resolverTramos(
  tx: TenantTx,
  codigo: string,
  fechaPeriodo: string,
): Promise<readonly Tramo[]> {
  const filas = await tx.execute(sql`
    select valor as tramos
    from regla
    where codigo = ${codigo}
      and jurisdiccion_id = 'PA'
      and vigente_desde <= ${fechaPeriodo}::date
      and (vigente_hasta is null or vigente_hasta >= ${fechaPeriodo}::date)
    order by empresa_id nulls last
    limit 1
  `);
  const r = (filas as unknown as ReadonlyArray<{ tramos: FilaTramo[] | null }>)[0];
  if (!r?.tramos?.length) {
    throw new Error(`Sin tabla de tramos '${codigo}' vigente en ${fechaPeriodo}`);
  }
  return r.tramos.map((t) => ({
    hasta: t.hasta === null ? null : Money.of(t.hasta),
    tasa: Rate.of(t.tasa),
    baseFija: Money.of(t.baseFija),
  }));
}
