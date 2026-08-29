import { Rate, type TopesDescuento } from '@nomix/payroll-engine';
import type { TenantTx } from '../db/tenant.js';
import { resolverTasa } from '../rules/rule-resolver.js';

/**
 * Topes del Art. 161 resueltos por la fecha del período (ADR-001, ADR-004).
 *
 * El 50% y el 30% son cifras de ley, pero viven en `regla` igual que las tasas
 * de CSS: si una reforma los mueve, la planilla de un período anterior tiene
 * que seguir recalculándose con los topes que estaban vigentes entonces.
 */
export async function resolverTopesDescuento(
  tx: TenantTx,
  fecha: string,
): Promise<TopesDescuento> {
  const [global, vivienda] = await Promise.all([
    resolverTasa(tx, 'tope_descuento_global', fecha),
    resolverTasa(tx, 'tope_descuento_vivienda', fecha),
  ]);
  return { global: Rate.of(global), vivienda: Rate.of(vivienda) };
}
