import { eq, sql } from 'drizzle-orm';
import { schema } from '@nomix/db';
import {
  Money,
  acumularBases,
  calcularCicloVacaciones,
  diasDelPeriodo,
  type CatalogoConceptos,
} from '@nomix/payroll-engine';
import type { TenantTx } from '../db/tenant.js';
import { resolverTasa } from '../rules/rule-resolver.js';
import { serializarLinea } from './planilla.service.js';

/**
 * Ayuda de cálculo para el pago de vacaciones (base legal §6, Art. 54-62).
 *
 * No es un tipo de planilla ni un workflow con tabla propia (ADR-016): es una
 * consulta que reconstruye el ciclo del colaborador desde su histórico —
 * exactamente el mismo principio que el XIII (`ADR-015`) — y devuelve un monto
 * sugerido para que quien captura el movimiento lo revise antes de guardarlo.
 * El colaborador termina como una línea `vacaciones_pagadas` normal, sujeta a
 * la misma matriz de incidencia que cualquier otro concepto (ADR-002).
 */

const UN_DIA_MS = 86_400_000;

function sumarDias(fechaIso: string, dias: number): string {
  const t = Date.parse(`${fechaIso}T00:00:00Z`);
  return new Date(t + dias * UN_DIA_MS).toISOString().slice(0, 10);
}

/**
 * Inicio del ciclo vigente: el día siguiente a la última vez que se pagó
 * `vacaciones_pagadas`, o la fecha de ingreso si nunca se ha pagado. No se
 * guarda ningún "saldo" — se relee del histórico en cada consulta, así que
 * corregir una línea de un ciclo anterior corrige el actual sin dejar nada
 * desincronizado (mismo principio que `ADR-014` y `ADR-015`).
 */
async function resolverInicioCiclo(
  tx: TenantTx,
  colaboradorId: string,
  fechaIngreso: string,
): Promise<string> {
  const filas = await tx.execute(sql`
    select max(c.periodo_hasta)::text as ultima
    from planilla_detalle d
    join planilla_cabecera c on c.id = d.planilla_id
    where d.colaborador_id = ${colaboradorId}
      and d.concepto_codigo = 'vacaciones_pagadas'
  `);
  const ultima = (filas as unknown as ReadonlyArray<{ ultima: string | null }>)[0]?.ultima ?? null;
  return ultima === null ? fechaIngreso : sumarDias(ultima, 1);
}

interface FilaAcumulada {
  concepto_codigo: string;
  monto: string;
}

/** Suma, por concepto, lo que el colaborador percibió entre `desde` y `hasta`. */
async function acumularCiclo(
  tx: TenantTx,
  colaboradorId: string,
  desde: string,
  hasta: string,
  planillaIdActual: string,
  catalogo: CatalogoConceptos,
): Promise<Money> {
  const filas = await tx.execute(sql`
    select d.concepto_codigo, sum(d.monto)::text as monto
    from planilla_detalle d
    join planilla_cabecera c on c.id = d.planilla_id
    where d.colaborador_id = ${colaboradorId}
      and c.periodo_hasta between ${desde}::date and ${hasta}::date
      and d.planilla_id <> ${planillaIdActual}
    group by d.concepto_codigo
  `);
  const lineas = (filas as unknown as readonly FilaAcumulada[]).map((f) => ({
    conceptoCodigo: f.concepto_codigo,
    monto: Money.of(f.monto),
  }));
  return acumularBases(lineas, catalogo).promedioVacaciones;
}

/**
 * Resultado ya serializado (Money/Rate → string) para salir por HTTP. A
 * diferencia de la planilla normal, esto NO se persiste primero — es la
 * primera respuesta de la API que devuelve un resultado del motor en vivo,
 * así que pasa por `serializarLinea` igual que hace `preview` (ADR-006: nunca
 * dejar un `Money`/`Rate` crudo cruzar la frontera HTTP).
 */
export interface CicloVacacionesCalculado {
  readonly linea: Record<string, string>;
  readonly diasAcumulados: string;
  readonly cicloCompleto: boolean;
  readonly ventanaDesde: string;
  readonly ventanaHasta: string;
  readonly advertencias: readonly string[];
}

/**
 * Calcula el ciclo vigente de vacaciones de un colaborador a la fecha de corte.
 * Solo lee: no persiste ni modifica ningún movimiento. El resultado es un
 * monto sugerido para prellenar el movimiento `vacaciones_pagadas`.
 */
export async function calcularVacacionesColaborador(
  tx: TenantTx,
  colaboradorId: string,
  fechaCorte: string,
  planillaIdActual: string,
  catalogo: CatalogoConceptos,
): Promise<CicloVacacionesCalculado> {
  const [colab] = await tx.select().from(schema.colaborador).where(eq(schema.colaborador.id, colaboradorId));
  if (!colab) throw new Error(`Colaborador '${colaboradorId}' no encontrado.`);

  const desde = await resolverInicioCiclo(tx, colaboradorId, colab.fechaIngreso);
  if (desde > fechaCorte) {
    throw new Error(
      `El ciclo de vacaciones de este colaborador inicia el ${desde}, después de la fecha de ` +
        `corte solicitada (${fechaCorte}).`,
    );
  }

  const [divisor, divisorDiario] = await Promise.all([
    resolverTasa(tx, 'divisor_vacaciones', fechaCorte),
    resolverTasa(tx, 'divisor_salario_diario', fechaCorte),
  ]);
  const diasCicloCompleto = String(Number(divisor) * Number(divisorDiario));

  const salariosDelCiclo = await acumularCiclo(
    tx,
    colaboradorId,
    desde,
    fechaCorte,
    planillaIdActual,
    catalogo,
  );
  const diasCiclo = diasDelPeriodo({ desde, hasta: fechaCorte });

  const resultado = calcularCicloVacaciones({
    salariosDelCiclo,
    diasCiclo,
    divisor,
    diasCicloCompleto,
    concepto: 'vacaciones_pagadas',
    baseLegal: catalogo.get('vacaciones_pagadas').baseLegal,
  });

  const advertencias: string[] = [];
  if (!resultado.cicloCompleto) {
    advertencias.push(
      `El ciclo lleva ${String(diasCiclo)} de ${diasCicloCompleto} días (11 meses × ` +
        `${divisorDiario} días, base legal §6 — equivalencia no verificada, ver ADR-016). ` +
        `El monto sugerido es proporcional, no un ciclo completo.`,
    );
  }
  if (salariosDelCiclo.isZero()) {
    advertencias.push(
      'No se encontraron líneas de planilla en la ventana del ciclo: revisa que las planillas ' +
        'de ese período ya estén calculadas.',
    );
  }

  return {
    linea: serializarLinea(resultado.linea),
    diasAcumulados: resultado.diasAcumulados.decimal.toFixed(2),
    cicloCompleto: resultado.cicloCompleto,
    ventanaDesde: desde,
    ventanaHasta: fechaCorte,
    advertencias,
  };
}
