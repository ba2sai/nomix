import { Money, Rate } from '../money.js';
import type { LineaCalculada } from '../seguridad-social/css.js';

/**
 * Vacaciones (base legal §6, Código de Trabajo Art. 54–62).
 *
 * A diferencia del XIII Mes, el ciclo de vacaciones NO es un calendario fijo
 * compartido por toda la empresa: cada colaborador tiene el suyo, anclado a su
 * `fecha_ingreso` y renovado cada vez que se le paga. Por eso este módulo no
 * resuelve "en qué ventana estamos" — esa fecha la trae el llamador (capa de
 * datos, `apps/api/src/planilla/vacaciones.ts`), reconstruida del histórico
 * exactamente como el XIII: la última línea `vacaciones_pagadas` cierra un
 * ciclo y abre el siguiente, sin guardar un saldo que se desincronizaría.
 *
 * **Equivalencia declarada, no verificada:** el Art. 54 dice "30 días por cada
 * 11 meses"; el hueco 🏛️ de la consulta B4 anota que "1 día por cada 11 días
 * trabajados" es una formulación distinta que redondea diferente. Este módulo
 * las trata como equivalentes usando la MISMA convención de mes de 30 días que
 * ya adopta `divisor_salario_diario` (11 meses × 30 días = 330 días → 30/330 =
 * 1/11). Como `divisor_salario_diario` está marcado `pendiente` en el
 * catálogo, esta equivalencia HEREDA esa incertidumbre: no es una demostración
 * independiente como la del divisor 12 del XIII. Se declara `verificar`, no
 * `verificado`.
 *
 * **Pago:** igual que el XIII, la partida se emite como línea del concepto
 * `vacaciones_pagadas`, que ya vive en el catálogo con su régimen de CSS/SE/ISR
 * ordinario (doblemente verificado contra el asiento real de jun-2026). Este
 * módulo no decide retenciones: solo el monto y los días acumulados.
 */

export interface InsumoCicloVacaciones {
  /**
   * Σ de los salarios percibidos en el ciclo, ya filtrada por la matriz de
   * incidencia (`Bases.promedioVacaciones`) — la misma columna que decide qué
   * entra al promedio, consultada por concepto y no cableada aquí (ADR-002).
   */
  readonly salariosDelCiclo: Money;
  /** Días calendario desde el inicio del ciclo hasta la fecha de corte. */
  readonly diasCiclo: number;
  /** Divisor — regla `divisor_vacaciones` ("11", base legal §6, `verificar`). */
  readonly divisor: string;
  /** Días de un ciclo completo bajo la misma convención ("330", `verificar`). */
  readonly diasCicloCompleto: string;
  readonly concepto: string;
  readonly baseLegal: string;
}

export interface ResultadoCicloVacaciones {
  readonly linea: LineaCalculada;
  /** Días acumulados en el ciclo (`diasCiclo ÷ 11`), informativo — no paga por día. */
  readonly diasAcumulados: Rate;
  /** `true` si el ciclo alcanzó los 330 días (11 meses completos). */
  readonly cicloCompleto: boolean;
}

/**
 * Calcula el pago de un ciclo de vacaciones, completo o parcial.
 *
 *   monto = Σ(salarios del ciclo) ÷ 11
 *
 * Igual que el XIII (÷12 da un mes de sueldo por un año repartido en tres
 * partidas), ÷11 da 30 días de sueldo por 11 meses de ciclo: es "un mes de
 * salario promedio", no un cálculo día por día. Un ciclo parcial (colaborador
 * que aún no cumple los 11 meses, o liquidación anticipada) acumula menos por
 * construcción, sin prorrateo aparte — mismo principio que el Art. 2º del
 * Decreto 221 aplicado al XIII.
 *
 * No valida el fraccionamiento del Art. 56 (máximo 2 partes, solo con
 * convención colectiva): esa regla depende de si la empresa tiene convención
 * colectiva vigente, dato que la ficha de empresa no captura todavía
 * (consulta B4.d). Se deja fuera de este módulo, no se asume en silencio.
 */
export function calcularCicloVacaciones(insumo: InsumoCicloVacaciones): ResultadoCicloVacaciones {
  const monto = insumo.salariosDelCiclo.dividedBy(insumo.divisor);
  const diasAcumulados = Rate.of(String(insumo.diasCiclo)).dividedBy(insumo.divisor);
  const cicloCompleto = insumo.diasCiclo >= Number(insumo.diasCicloCompleto);

  return {
    diasAcumulados,
    cicloCompleto,
    linea: {
      concepto: insumo.concepto,
      base: insumo.salariosDelCiclo,
      tasa: insumo.salariosDelCiclo.isZero()
        ? Rate.of('1').dividedBy(insumo.divisor)
        : Rate.of(monto.toString()).dividedBy(insumo.salariosDelCiclo.toString()),
      monto: monto.round(2),
      baseLegal: insumo.baseLegal,
    },
  };
}
