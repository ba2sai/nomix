import { sql, type SQL } from 'drizzle-orm';
import { Money, Rate, type Tramo } from '@nomix/payroll-engine';
import type { TenantTx } from '../db/tenant.js';

/**
 * Lee el `valor` jsonb de la regla vigente en `fechaPeriodo` (ADR-001).
 *
 * Se ejecuta dentro del contexto de inquilino: el RLS de `regla` ya deja ver
 * las reglas generales del país (empresa_id null) más las de la empresa activa.
 * `order by empresa_id nulls last` prefiere el override de la empresa (convenio
 * colectivo) sobre la regla general cuando ambas coexisten.
 *
 * La fecha es la del PERÍODO que se calcula, no la de hoy: recalcular una
 * planilla de 2024 resuelve las reglas de 2024.
 *
 * `soloGeneral` ignora los overrides de empresa. Lo necesita el control del piso
 * irrenunciable del XIII (Decreto 19 de 1973 Art. 5º), que compara el resultado
 * del convenio colectivo contra el de la regla general del país.
 */
async function leerValor(
  tx: TenantTx,
  codigo: string,
  fechaPeriodo: string,
  soloGeneral = false,
): Promise<unknown> {
  const soloPais: SQL = soloGeneral ? sql`and empresa_id is null` : sql.empty();
  const filas = await tx.execute(sql`
    select valor
    from regla
    where codigo = ${codigo}
      and jurisdiccion_id = 'PA'
      and vigente_desde <= ${fechaPeriodo}::date
      and (vigente_hasta is null or vigente_hasta >= ${fechaPeriodo}::date)
      ${soloPais}
    order by empresa_id nulls last
    limit 1
  `);
  const r = (filas as unknown as ReadonlyArray<{ valor: unknown }>)[0];
  if (r === undefined) throw new Error(`Sin regla '${codigo}' vigente en ${fechaPeriodo}`);
  return r.valor;
}

/** Extrae el escalar `{ tasa }`; `null` si la regla no tiene esa forma. */
function comoTasa(valor: unknown): string | null {
  if (typeof valor === 'object' && valor !== null && 'tasa' in valor) {
    const t: unknown = valor.tasa;
    if (typeof t === 'string') return t;
  }
  return null;
}

/** Escalar `{ tasa }` de una regla: tasas de retención, factores, divisores. */
export async function resolverTasa(
  tx: TenantTx,
  codigo: string,
  fechaPeriodo: string,
): Promise<string> {
  const tasa = comoTasa(await leerValor(tx, codigo, fechaPeriodo));
  if (tasa === null) throw new Error(`Sin regla '${codigo}' vigente en ${fechaPeriodo}`);
  return tasa;
}

/**
 * La misma tasa pero ignorando cualquier override de empresa, para comparar un
 * convenio colectivo contra la regla general del país.
 */
export async function resolverTasaGeneral(
  tx: TenantTx,
  codigo: string,
  fechaPeriodo: string,
): Promise<string> {
  const tasa = comoTasa(await leerValor(tx, codigo, fechaPeriodo, true));
  if (tasa === null) {
    throw new Error(`Sin regla general '${codigo}' vigente en ${fechaPeriodo}`);
  }
  return tasa;
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
  const valor = (await leerValor(tx, codigo, fechaPeriodo)) as FilaTramo[] | null;
  if (!valor?.length) {
    throw new Error(`Sin tabla de tramos '${codigo}' vigente en ${fechaPeriodo}`);
  }
  return valor.map((t) => ({
    hasta: t.hasta === null ? null : Money.of(t.hasta),
    tasa: Rate.of(t.tasa),
    baseFija: Money.of(t.baseFija),
  }));
}

/**
 * Resuelve una regla cuyo `valor` es una lista de objetos con forma propia — el
 * ciclo de partidas del XIII, por ejemplo. Devuelve los elementos crudos:
 * validar la forma es del módulo que la entiende, no de este resolver.
 */
export async function resolverLista(
  tx: TenantTx,
  codigo: string,
  fechaPeriodo: string,
): Promise<readonly unknown[]> {
  const valor = await leerValor(tx, codigo, fechaPeriodo);
  if (!Array.isArray(valor) || valor.length === 0) {
    throw new Error(`La regla '${codigo}' vigente en ${fechaPeriodo} no es una lista con elementos.`);
  }
  return valor as readonly unknown[];
}
