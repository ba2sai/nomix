import { Money, Rate } from '../money.js';
import type { LineaCalculada } from '../seguridad-social/css.js';

/**
 * Impuesto Sobre la Renta — método de retención ACUMULATIVO (base legal §4.5).
 *
 * La ley no prescribe cómo debe retener el empleador quincena a quincena — el
 * instructivo de la DGI describe solo la declaración anual (consulta A1,
 * `07_consultas_profesional_planilla.md`). Nomix eligió deliberadamente el
 * método acumulativo (recalcular el impuesto del año a la fecha en cada corte
 * y restar lo ya retenido) en vez de proyección simple: absorbe ingreso
 * variable y cambios de salario sin el ajuste traumático de fin de año.
 * Documentado como decisión de producto en `ADR-014`.
 *
 * Este módulo es puro: recibe los acumulados ya sumados por el llamador
 * (típicamente sumando la columna `base`/`monto` de líneas `isr_retencion`
 * persistidas en períodos anteriores del mismo año) y las tasas ya resueltas
 * por vigencia (ADR-001).
 */

/** Un tramo de la escala progresiva. `hasta = null` es el último tramo (sin techo). */
export interface Tramo {
  readonly hasta: Money | null;
  readonly tasa: Rate;
  readonly baseFija: Money;
}

/**
 * Calcula el impuesto causado sobre `rentaGravable` según una escala
 * progresiva (Art. 700 CF para ISR ordinario; Art. 701 lit. l para gastos de
 * representación).
 *
 * Los tramos deben venir ordenados de menor a mayor `hasta` (el de `hasta:
 * null` al final). El "excedente" de cada tramo se calcula sobre el `hasta`
 * del tramo anterior — así el 15% de la tabla panameña se aplica sobre el
 * excedente de B/.11,000, no sobre B/.11,000.01, sin necesidad de un campo
 * `desde` separado.
 */
export function calcularImpuestoTramos(rentaGravable: Money, tramos: readonly Tramo[]): Money {
  let umbralInferior = Money.ZERO;
  for (const t of tramos) {
    if (t.hasta === null || !rentaGravable.greaterThan(t.hasta)) {
      const excedente = rentaGravable.minus(umbralInferior);
      if (excedente.isNegative()) return Money.ZERO;
      return t.baseFija.plus(excedente.times(t.tasa)).round(2);
    }
    umbralInferior = t.hasta;
  }
  throw new Error('La escala de tramos no cubre el rango de la renta gravable (falta el tramo sin techo).');
}

export interface InsumoIsrAcumulativo {
  /** Base gravable de ESTE período únicamente (no acumulada). */
  readonly baseGravablePeriodo: Money;
  /** Suma de `baseGravablePeriodo` de todos los períodos anteriores del mismo año. */
  readonly baseGravableAcumuladaAnterior: Money;
  /** Suma de lo ya retenido en todos los períodos anteriores del mismo año. */
  readonly retenidoAcumuladoAnterior: Money;
  readonly tramos: readonly Tramo[];
  /**
   * Deducciones personales anuales conocidas (base legal §4.2: gastos médicos,
   * intereses hipotecarios, fondo de jubilación...). Nomix no captura hoy
   * ninguna de ellas — no hay campo en la ficha del colaborador — así que el
   * llamador pasa `Money.ZERO` mientras tanto. La deducción básica de B/.800
   * NO aplica aquí: es de la declaración conjunta anual, no de la retención
   * automática de planilla (base legal §4.2, corrección importante).
   */
  readonly deduccionesPersonalesAnuales: Money;
  readonly concepto: string;
  readonly baseLegal: string;
}

/**
 * Retención de este período bajo el método acumulativo:
 *
 *   impuestoCausadoAcumulado = tramos(baseAcumulada − deducciones)
 *   retención = max(0, impuestoCausadoAcumulado − retenidoAcumuladoAnterior)
 *
 * La retención nunca es negativa: si el impuesto acumulado bajó (p. ej. se
 * declaró una deducción a mitad de año), Nomix no reembolsa automáticamente a
 * mitad de año — eso es un ajuste de cierre, no de esta función.
 *
 * `base` en la línea resultante es la base gravable de ESTE período (no la
 * acumulada): así, sumar la columna `base` de las líneas persistidas en años
 * sucesivos reconstruye el acumulado sin guardar una cifra "acumulada" que se
 * volvería incorrecta si un período anterior se recalcula.
 */
export function calcularIsrAcumulativo(insumo: InsumoIsrAcumulativo): LineaCalculada {
  const baseAcumulada = insumo.baseGravableAcumuladaAnterior.plus(insumo.baseGravablePeriodo);
  const rentaNetaGravable = baseAcumulada.minus(insumo.deduccionesPersonalesAnuales);
  const causadoAcumulado = rentaNetaGravable.isNegative()
    ? Money.ZERO
    : calcularImpuestoTramos(rentaNetaGravable, insumo.tramos);
  const diferencia = causadoAcumulado.minus(insumo.retenidoAcumuladoAnterior);
  const retencionPeriodo = diferencia.isNegative() ? Money.ZERO : diferencia;

  return {
    concepto: insumo.concepto,
    base: insumo.baseGravablePeriodo,
    // Tasa efectiva de ESTE período sobre SU base, para trazabilidad legible;
    // no es un tramo único porque el método es acumulativo, no marginal puro.
    tasa: insumo.baseGravablePeriodo.isZero()
      ? Rate.of('0')
      : Rate.of(retencionPeriodo.toString()).dividedBy(insumo.baseGravablePeriodo.toString()),
    monto: retencionPeriodo,
    baseLegal: insumo.baseLegal,
  };
}
