import { Decimal } from 'decimal.js';

// Precisión interna amplia; el redondeo se aplica solo en la frontera (ADR-006).
Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

/**
 * Money — valor monetario de precisión exacta (ADR-006).
 *
 * Envuelve decimal.js y NO expone operadores aritméticos: no existe forma de
 * escribir `a + b` sobre dos Money, porque el `+` de TypeScript no aplica a
 * objetos. Esa es la primera línea de defensa contra la aritmética de punto
 * flotante (ADR-010). Toda operación es explícita: plus, minus, times, etc.
 *
 * Regla de oro: NUNCA se construye un Money a partir de un `number` con parte
 * decimal escrito en el código. Los valores entran como string, típicamente
 * desde la configuración de reglas (ADR-001) o desde columnas `numeric` de la
 * base de datos, que Drizzle devuelve como string (ARCHITECTURE §4.4).
 */
export class Money {
  private readonly value: Decimal;

  private constructor(value: Decimal) {
    this.value = value;
  }

  /** Construye desde un string decimal ("7045.41") o un entero exacto. */
  static of(input: string | number | Money): Money {
    if (input instanceof Money) return input;
    if (typeof input === 'number' && !Number.isInteger(input)) {
      throw new TypeError(
        `Money.of no acepta números con decimales (${input}). ` +
          `Pasa un string para no perder precisión. Ver ADR-006.`,
      );
    }
    return new Money(new Decimal(input));
  }

  static readonly ZERO = new Money(new Decimal(0));

  plus(other: Money): Money {
    return new Money(this.value.plus(other.value));
  }

  minus(other: Money): Money {
    return new Money(this.value.minus(other.value));
  }

  /** Multiplica por un factor adimensional (p. ej. una tasa "0.0975"). */
  times(factor: Rate | string): Money {
    const f = typeof factor === 'string' ? new Decimal(factor) : factor.decimal;
    return new Money(this.value.times(f));
  }

  /**
   * Divide por un divisor adimensional (horas mensuales "208", períodos "2").
   * El cociente conserva la precisión interna: NUNCA se redondea aquí, solo en
   * la frontera de salida (ADR-006), o los descuadres contra la CSS aparecen.
   */
  dividedBy(divisor: Rate | string): Money {
    const d = typeof divisor === 'string' ? new Decimal(divisor) : divisor.decimal;
    if (d.isZero()) throw new RangeError('División por cero en un cálculo monetario.');
    return new Money(this.value.dividedBy(d));
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  greaterThan(other: Money): boolean {
    return this.value.greaterThan(other.value);
  }

  /** Devuelve el mayor de dos montos (Decreto 19/1973 Art. 3º: aguinaldo vs XIII). */
  static max(a: Money, b: Money): Money {
    return a.value.greaterThanOrEqualTo(b.value) ? a : b;
  }

  /** Redondea a `dp` decimales HALF_UP. Solo en la frontera de salida (ADR-006). */
  round(dp = 2): Money {
    return new Money(this.value.toDecimalPlaces(dp, Decimal.ROUND_HALF_UP));
  }

  /** Representación exacta para persistir en columnas `numeric`. */
  toString(): string {
    return this.value.toFixed();
  }

  /** Cadena redondeada a 2 decimales, para archivos de salida y presentación. */
  toFixed2(): string {
    return this.value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
  }
}

/**
 * Rate — una tasa o factor (CSS 9.75% = "0.0975"). Se construye desde string
 * porque su origen es siempre la configuración de reglas versionada (ADR-001),
 * nunca un literal en el código.
 */
export class Rate {
  readonly decimal: Decimal;

  private constructor(decimal: Decimal) {
    this.decimal = decimal;
  }

  static of(input: string): Rate {
    return new Rate(new Decimal(input));
  }

  /**
   * Factor total de un recargo: 1 + recargo. La hora extra diurna se paga al
   * 125% del valor ordinario, no al 25% (Art. 33). Escribir `1 + 0.25` a mano
   * en el motor es exactamente lo que ADR-010 prohíbe.
   */
  masUno(): Rate {
    return new Rate(this.decimal.plus(1));
  }

  /** Proporción derivada: 1/2 de un mes, 13/30 de días. Para la traza (ADR-005). */
  dividedBy(divisor: string): Rate {
    const d = new Decimal(divisor);
    if (d.isZero()) throw new RangeError('División por cero al derivar una proporción.');
    return new Rate(this.decimal.dividedBy(d));
  }

  /** Porcentaje legible para trazabilidad ("13.2500%"). */
  toPercentString(dp = 4): string {
    return `${this.decimal.times(100).toFixed(dp)}%`;
  }
}
