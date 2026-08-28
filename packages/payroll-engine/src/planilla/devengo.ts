import { Money, Rate } from '../money.js';
import type { LineaCalculada } from '../seguridad-social/css.js';

/**
 * Devengo: convierte el salario contratado y las cantidades capturadas
 * (horas, días) en montos del período.
 *
 * Ninguna convención está cableada aquí. El divisor diario, las horas
 * mensuales y los factores de recargo llegan como parámetros ya resueltos por
 * la fecha del período (ADR-001), porque todos son valores con vigencia y
 * varios siguen marcados ❓ PENDIENTE en la base legal §12.1.
 */

/** Convención de prorrateo del salario base. Decisión por empresa. */
export type MetodoProrrateo = 'mitad_mensual' | 'dias_reales';

export interface Periodo {
  /** 'YYYY-MM-DD' */
  readonly desde: string;
  /** 'YYYY-MM-DD' — inclusivo. */
  readonly hasta: string;
}

export interface ParametrosDevengo {
  readonly metodo: MetodoProrrateo;
  /**
   * Períodos que tiene el mes para este tipo de planilla ("2" para quincenal).
   * Es aritmética del calendario de pago, no una constante legal.
   */
  readonly periodosPorMes: string;
  /** Divisor del salario diario — regla `divisor_salario_diario` (base legal §12.1). */
  readonly divisorDiario: string;
  /** Divisor de la hora ordinaria — `empresa.horas_mensuales` (208 o 192). */
  readonly horasMensuales: string;
}

/** Días calendario del período, ambos extremos incluidos. */
export function diasDelPeriodo(periodo: Periodo): number {
  const desde = Date.parse(`${periodo.desde}T00:00:00Z`);
  const hasta = Date.parse(`${periodo.hasta}T00:00:00Z`);
  if (Number.isNaN(desde) || Number.isNaN(hasta)) {
    throw new TypeError(`Período inválido: ${periodo.desde}..${periodo.hasta}. Se espera YYYY-MM-DD.`);
  }
  if (hasta < desde) {
    throw new RangeError(`El período termina antes de empezar: ${periodo.desde}..${periodo.hasta}.`);
  }
  const MS_POR_DIA = 86_400_000;
  return Math.round((hasta - desde) / MS_POR_DIA) + 1;
}

/**
 * Salario base devengado en el período.
 *
 * `mitad_mensual` paga `salario ÷ períodosPorMes` sin mirar los días del tramo:
 * la 2ª quincena de febrero paga lo mismo que la de enero. Es la práctica que
 * reproduce el asiento real de jun-2026 y la que espera el contador.
 *
 * `dias_reales` paga `salario ÷ divisorDiario × días`, que es más exacto
 * contablemente pero da netos variables mes a mes.
 */
export function devengarSalarioBase(
  salarioMensual: Money,
  periodo: Periodo,
  params: ParametrosDevengo,
): LineaCalculada {
  if (params.metodo === 'mitad_mensual') {
    return {
      concepto: 'salario_ordinario',
      base: salarioMensual,
      tasa: Rate.of('1').dividedBy(params.periodosPorMes),
      monto: salarioMensual.dividedBy(params.periodosPorMes),
      baseLegal: 'Convención de nómina — prorrateo mitad_mensual (doc 05 §2)',
    };
  }
  const dias = diasDelPeriodo(periodo);
  const salarioDiario = salarioMensual.dividedBy(params.divisorDiario);
  return {
    concepto: 'salario_ordinario',
    base: salarioMensual,
    tasa: Rate.of(String(dias)).dividedBy(params.divisorDiario),
    monto: salarioDiario.times(String(dias)),
    baseLegal: `Convención de nómina — prorrateo dias_reales (${String(dias)}/${params.divisorDiario})`,
  };
}

/** Valor de la hora ordinaria: salario mensual ÷ horas mensuales (base legal §12.1). */
export function salarioHora(salarioMensual: Money, horasMensuales: string): Money {
  return salarioMensual.dividedBy(horasMensuales);
}

/**
 * Horas extra y recargos. El pago total es `hora × cantidad × (1 + recargo)`:
 * el recargo del Art. 33 se suma AL valor de la hora, no lo sustituye.
 *
 * `factorRecargo` llega resuelto desde `regla` (0.25 diurna, 0.50 nocturna,
 * 0.75 mixta de inicio nocturno, 1.50 día de fiesta).
 */
export function devengarHoras(
  conceptoCodigo: string,
  horas: string,
  salarioMensual: Money,
  factorRecargo: Rate,
  params: ParametrosDevengo,
  baseLegal: string,
): LineaCalculada {
  const hora = salarioHora(salarioMensual, params.horasMensuales);
  const factorTotal = factorRecargo.masUno();
  return {
    concepto: conceptoCodigo,
    base: hora.times(horas),
    tasa: factorTotal,
    monto: hora.times(horas).times(factorTotal),
    baseLegal,
  };
}

/**
 * Conceptos capturados por días (ausencias, permisos). El monto sale del
 * salario diario; el signo lo pone el tipo del concepto al acumular las bases.
 */
export function devengarDias(
  conceptoCodigo: string,
  dias: string,
  salarioMensual: Money,
  params: ParametrosDevengo,
  baseLegal: string,
): LineaCalculada {
  const diario = salarioMensual.dividedBy(params.divisorDiario);
  return {
    concepto: conceptoCodigo,
    base: diario,
    tasa: Rate.of(dias),
    monto: diario.times(dias),
    baseLegal,
  };
}
