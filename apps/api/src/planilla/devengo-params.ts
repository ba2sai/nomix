import { schema } from '@nomix/db';
import type { MetodoProrrateo, ParametrosDevengo } from '@nomix/payroll-engine';
import type { TenantTx } from '../db/tenant.js';
import { resolverTasa } from '../rules/rule-resolver.js';

/**
 * Períodos de pago que tiene un mes, por tipo de planilla.
 *
 * Es aritmética del calendario de pago, no una constante legal: la quincenal
 * tiene 2 cortes al mes, la bisemanal 26 al año (26/12), y las "mensual 1ra/2da
 * quincena" pagan el sueldo completo en uno solo de los dos cortes.
 */
const PERIODOS_POR_MES: Record<string, string> = {
  quincenal: '2',
  quincenal_pago_hora: '2',
  bisemanal: '2.166667',
  mensual_1ra_qna: '1',
  mensual_2da_qna: '1',
};

export function periodosPorMes(tipoPlanilla: string): string {
  const p = PERIODOS_POR_MES[tipoPlanilla];
  if (!p) {
    throw new Error(
      `Tipo de planilla '${tipoPlanilla}' sin períodos por mes definidos. ` +
        `Tipos conocidos: ${Object.keys(PERIODOS_POR_MES).join(', ')}.`,
    );
  }
  return p;
}

/**
 * Resuelve los parámetros de devengo del período: la convención de prorrateo de
 * la empresa, sus horas mensuales y el divisor diario vigente (ADR-001).
 */
export async function resolverParametrosDevengo(
  tx: TenantTx,
  tipoPlanilla: string,
  fechaPeriodo: string,
): Promise<ParametrosDevengo> {
  const [emp] = await tx.select().from(schema.empresa);
  if (!emp) throw new Error('No hay empresa activa en el contexto de la transacción.');
  return {
    metodo: emp.metodoProrrateo as MetodoProrrateo,
    periodosPorMes: periodosPorMes(tipoPlanilla),
    divisorDiario: await resolverTasa(tx, 'divisor_salario_diario', fechaPeriodo),
    horasMensuales: emp.horasMensuales,
  };
}
