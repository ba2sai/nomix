import { eq } from 'drizzle-orm';
import { schema } from '@nomix/db';
import {
  Money,
  calcularLiquidacion,
  type CausaTerminacion,
  type TramoIndemnizacion,
} from '@nomix/payroll-engine';
import type { TenantTx } from '../db/tenant.js';
import { resolverLista, resolverTasa } from '../rules/rule-resolver.js';

/**
 * Liquidación laboral (base legal §8, ADR-017). La mecánica legal vive en el
 * motor; aquí solo se resuelven la antigüedad real del colaborador y las
 * escalas vigentes a la fecha de terminación.
 *
 * Como el cálculo de vacaciones (`ADR-016`), esto **solo lee**: devuelve una
 * propuesta de liquidación para revisar. No persiste, no da de baja al
 * colaborador y no genera planilla. Un cálculo de liquidación se revisa varias
 * veces antes de ejecutarse, y ejecutar la terminación es otra decisión.
 */

interface FilaTramoIndemnizacion {
  hastaAnios: unknown;
  semanasPorAnio: unknown;
}

function comoTramo(fila: unknown, indice: number): TramoIndemnizacion {
  const f = fila as FilaTramoIndemnizacion;
  const hasta = f.hastaAnios;
  if ((hasta !== null && typeof hasta !== 'number') || typeof f.semanasPorAnio !== 'string') {
    throw new Error(
      `La regla 'escala_indemnizacion' tiene el elemento ${String(indice)} mal formado. ` +
        `Se espera { hastaAnios: number | null, semanasPorAnio: string }.`,
    );
  }
  return { hastaAnios: hasta, semanasPorAnio: f.semanasPorAnio };
}

const UN_DIA_MS = 86_400_000;

/**
 * Antigüedad entre dos fechas, en años completos más la fracción del año en
 * curso. La fracción se mide en días sobre 365, que es la convención más
 * simple y la única que no depende del `divisor_salario_diario` (marcado
 * `pendiente`). La consulta **D1.a** —si la proporción va por meses cumplidos,
 * por días, o con algún redondeo— sigue abierta.
 */
export function antiguedad(ingreso: string, salida: string): { anios: number; fraccion: string } {
  const desde = Date.parse(`${ingreso}T00:00:00Z`);
  const hasta = Date.parse(`${salida}T00:00:00Z`);
  if (Number.isNaN(desde) || Number.isNaN(hasta)) {
    throw new Error(`Fechas inválidas: ${ingreso}..${salida}. Se espera YYYY-MM-DD.`);
  }
  if (hasta < desde) {
    throw new Error(`La fecha de salida (${salida}) es anterior al ingreso (${ingreso}).`);
  }
  const dias = Math.round((hasta - desde) / UN_DIA_MS);
  const anios = Math.floor(dias / 365);
  const fraccion = (dias - anios * 365) / 365;
  return { anios, fraccion: fraccion.toFixed(6) };
}

export interface PropuestaLiquidacion {
  readonly colaborador: string;
  readonly fechaIngreso: string;
  readonly fechaSalida: string;
  readonly causa: CausaTerminacion;
  readonly aniosServicio: number;
  readonly antiguedadAnios: string;
  readonly salarioSemanal: string;
  /**
   * Líneas con las SEMANAS explícitas en vez de una tasa porcentual: en una
   * liquidación el multiplicador son semanas de salario, y presentarlo como
   * "671.2329%" (que es lo que da `serializarLinea`) confunde a quien la revisa.
   */
  readonly lineas: readonly {
    concepto: string;
    salarioSemanal: string;
    semanas: string;
    monto: string;
    baseLegal: string;
  }[];
  readonly total: string;
  readonly advertencias: readonly string[];
}

/**
 * Propone la liquidación de un colaborador a una fecha de salida y una causa.
 *
 * `semanasPreaviso` lo decide quien liquida, no este código: si el empleador
 * otorgó el preaviso en tiempo no hay pago, y si el trabajador renunció sin
 * avisar la semana del Art. 222 va en contra. Inferirlo de la causa sería
 * adivinar un hecho que solo conoce RRHH.
 */
export async function proponerLiquidacion(
  tx: TenantTx,
  colaboradorId: string,
  fechaSalida: string,
  causa: CausaTerminacion,
  semanasPreaviso: string | null,
): Promise<PropuestaLiquidacion> {
  const [colab] = await tx
    .select()
    .from(schema.colaborador)
    .where(eq(schema.colaborador.id, colaboradorId));
  if (!colab) throw new Error(`Colaborador '${colaboradorId}' no encontrado.`);

  const { anios, fraccion } = antiguedad(colab.fechaIngreso, fechaSalida);

  const [escalaCruda, divisorSemanal, semanasPrima, semanasMinimas] = await Promise.all([
    resolverLista(tx, 'escala_indemnizacion', fechaSalida),
    resolverTasa(tx, 'divisor_salario_semanal', fechaSalida),
    resolverTasa(tx, 'semanas_prima_antiguedad', fechaSalida),
    resolverTasa(tx, 'semanas_minimas_indemnizacion', fechaSalida),
  ]);

  const r = calcularLiquidacion({
    // Consulta D2 (🔴 crítica): se usa el salario contratado vigente. El motor
    // lo declara en sus advertencias en vez de presentarlo como resuelto.
    salarioMensual: Money.of(colab.salarioMensual),
    divisorSemanal,
    aniosServicio: anios,
    fraccionAnio: fraccion,
    causa,
    escalaIndemnizacion: escalaCruda.map(comoTramo),
    semanasPrimaPorAnio: semanasPrima,
    semanasMinimasIndemnizacion: semanasMinimas,
    semanasPreaviso,
  });

  const advertencias = [...r.advertencias];
  if (colab.esTecnico && causa === 'renuncia') {
    advertencias.push(
      'Este colaborador está marcado como técnico: el Art. 222 le exige avisar con 2 meses, no ' +
        'con 15 días. Verifica el preaviso antes de aprobar la liquidación.',
    );
  }
  advertencias.push(
    'Faltan en esta propuesta las vacaciones y el XIII proporcionales al cese (consulta D7, sin ' +
      'responder: no está confirmado cómo se calculan ni si cotizan CSS). Calcúlalos aparte.',
  );

  return {
    colaborador: `${colab.nombres} ${colab.apellidos}`,
    fechaIngreso: colab.fechaIngreso,
    fechaSalida,
    causa,
    aniosServicio: anios,
    antiguedadAnios: r.antiguedad.decimal.toFixed(4),
    salarioSemanal: r.salarioSemanal.toFixed2(),
    lineas: r.lineas.map((l) => ({
      concepto: l.concepto,
      salarioSemanal: l.base.toFixed2(),
      semanas: l.tasa.decimal.toFixed(4),
      monto: l.monto.toFixed2(),
      baseLegal: l.baseLegal,
    })),
    total: r.total.toFixed2(),
    advertencias,
  };
}
