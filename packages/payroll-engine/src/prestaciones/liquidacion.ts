import { Money, Rate } from '../money.js';
import type { LineaCalculada } from '../seguridad-social/css.js';

/**
 * Liquidación laboral (base legal §8, Código de Trabajo Art. 210–229).
 *
 * Es el módulo con más exposición legal del sistema: un error aquí es una
 * demanda en MITRADEL. Por eso todo lo que no está firmemente verificado se
 * declara en `advertencias` en vez de resolverse por lo bajo.
 *
 * Tres componentes, cada uno con su artículo:
 *
 *  - **Prima de antigüedad (Art. 224)** — 1 semana de salario por año laborado,
 *    proporcional en años incompletos. Se paga **cualquiera sea la causa** de
 *    terminación, incluida la renuncia.
 *  - **Indemnización (Art. 225)** — solo por despido injustificado o renuncia
 *    justificada: 3.4 semanas por año los primeros 10 años, 1 semana por año
 *    después, con un mínimo absoluto de 1 semana.
 *  - **Preaviso (Art. 212/222)** — a favor del trabajador cuando el empleador
 *    despide sin avisar; a favor del EMPLEADOR (signo negativo) cuando el
 *    trabajador renuncia sin avisar.
 *
 * Ni las escalas ni el divisor semanal viven aquí: llegan resueltos por la
 * fecha de la terminación desde `regla` (ADR-001), porque el propio Art. 225
 * conserva regímenes históricos distintos según la fecha de ingreso.
 */

/** Cómo terminó la relación. Determina qué componentes proceden. */
export type CausaTerminacion =
  | 'despido_injustificado'
  | 'despido_justificado'
  | 'renuncia'
  | 'renuncia_justificada'
  | 'mutuo_acuerdo'
  | 'vencimiento_contrato';

/** Un tramo de la escala del Art. 225: semanas por año hasta cierta antigüedad. */
export interface TramoIndemnizacion {
  /** Años de antigüedad hasta los que aplica este tramo. `null` = sin techo. */
  readonly hastaAnios: number | null;
  /** Semanas de salario por cada año dentro del tramo. */
  readonly semanasPorAnio: string;
}

export interface InsumoLiquidacion {
  /**
   * Salario base de la liquidación.
   *
   * ⚠️ **Consulta D2 abierta (🔴 crítica).** No está resuelto si se usa el
   * último salario devengado, el promedio de los últimos meses, o el más
   * favorable al trabajador; ni si incluye horas extra y comisiones o solo el
   * salario base. El llamador decide y este módulo lo declara: nunca lo infiere.
   */
  readonly salarioMensual: Money;
  /**
   * Divisor para obtener el salario semanal — regla `divisor_salario_semanal`
   * ("4.333"). Consulta **D2.c** abierta: falta confirmar que sea el aceptado
   * ante MITRADEL.
   */
  readonly divisorSemanal: string;
  /** Años completos de servicio. */
  readonly aniosServicio: number;
  /** Fracción de año adicional, como proporción ("0.5" = medio año). */
  readonly fraccionAnio: string;
  readonly causa: CausaTerminacion;
  /** Escala del Art. 225 vigente a la fecha de terminación (`ADR-001`). */
  readonly escalaIndemnizacion: readonly TramoIndemnizacion[];
  /** Semanas de prima por año — regla `semanas_prima_antiguedad` ("1", Art. 224). */
  readonly semanasPrimaPorAnio: string;
  /** Mínimo absoluto de la indemnización en semanas ("1", Art. 225). */
  readonly semanasMinimasIndemnizacion: string;
  /**
   * Semanas de preaviso. Positivo = lo debe el empleador al trabajador;
   * negativo = lo debe el trabajador (renuncia sin aviso, Art. 222). `null` =
   * el preaviso se otorgó en tiempo y no genera pago.
   */
  readonly semanasPreaviso: string | null;
}

export interface ResultadoLiquidacion {
  readonly salarioSemanal: Money;
  /** Antigüedad total en años, con su fracción. */
  readonly antiguedad: Rate;
  readonly lineas: readonly LineaCalculada[];
  /** Suma de las líneas (el preaviso a cargo del trabajador resta). */
  readonly total: Money;
  readonly advertencias: readonly string[];
}

/**
 * Semanas de indemnización según la escala del Art. 225.
 *
 * La escala es progresiva por TRAMOS de antigüedad, no un factor único: los
 * primeros 10 años pagan 3.4 semanas cada uno y los siguientes 1 semana cada
 * uno, así que un trabajador de 15 años acumula 34 + 5 = 39 semanas. Calcularlo
 * con el factor del último tramo (15 × 1) o con el del primero (15 × 3.4) son
 * los dos errores clásicos; por eso se recorre tramo a tramo.
 */
export function semanasIndemnizacion(
  aniosConFraccion: Rate,
  escala: readonly TramoIndemnizacion[],
): Rate {
  let acumuladas = Rate.of('0');
  let pisoTramo = Rate.of('0');

  for (const tramo of escala) {
    const techo = tramo.hastaAnios === null ? null : Rate.of(String(tramo.hastaAnios));
    // Años que caen dentro de este tramo: min(antigüedad, techo) − piso.
    const tope =
      techo === null || aniosConFraccion.decimal.lessThan(techo.decimal) ? aniosConFraccion : techo;
    const enTramo = Rate.of(tope.decimal.minus(pisoTramo.decimal).toFixed());
    if (enTramo.decimal.isNegative() || enTramo.decimal.isZero()) {
      if (techo === null) break;
      pisoTramo = techo;
      continue;
    }
    acumuladas = Rate.of(
      acumuladas.decimal.plus(enTramo.decimal.times(tramo.semanasPorAnio)).toFixed(),
    );
    if (techo === null) break;
    pisoTramo = techo;
    if (!aniosConFraccion.decimal.greaterThan(techo.decimal)) break;
  }
  return acumuladas;
}

/** ¿Procede la indemnización del Art. 225 para esta causa? */
function procedeIndemnizacion(causa: CausaTerminacion): boolean {
  return causa === 'despido_injustificado' || causa === 'renuncia_justificada';
}

/**
 * Calcula la liquidación completa.
 *
 * La prima de antigüedad se paga siempre (Art. 224: "cualquiera sea la causa");
 * la indemnización solo por despido injustificado o renuncia justificada. Esa
 * distinción es la que más se equivoca en la práctica, y es la que más caro
 * sale.
 */
export function calcularLiquidacion(insumo: InsumoLiquidacion): ResultadoLiquidacion {
  const salarioSemanal = insumo.salarioMensual.dividedBy(insumo.divisorSemanal);
  const antiguedad = Rate.of(
    Rate.of(String(insumo.aniosServicio)).decimal.plus(insumo.fraccionAnio).toFixed(),
  );
  const lineas: LineaCalculada[] = [];
  const advertencias: string[] = [];

  // --- Prima de antigüedad (Art. 224) — siempre, cualquiera sea la causa ---
  const semanasPrima = Rate.of(
    antiguedad.decimal.times(insumo.semanasPrimaPorAnio).toFixed(),
  );
  lineas.push({
    concepto: 'prima_antiguedad',
    base: salarioSemanal,
    tasa: semanasPrima,
    monto: salarioSemanal.times(semanasPrima).round(2),
    baseLegal: 'Código de Trabajo Art. 224 — 1 semana por año, cualquiera sea la causa',
  });

  // --- Indemnización (Art. 225) — solo si la causa la genera ---
  if (procedeIndemnizacion(insumo.causa)) {
    const calculadas = semanasIndemnizacion(antiguedad, insumo.escalaIndemnizacion);
    const minimo = Rate.of(insumo.semanasMinimasIndemnizacion);
    const aplicaMinimo = calculadas.decimal.lessThan(minimo.decimal);
    const semanas = aplicaMinimo ? minimo : calculadas;
    if (aplicaMinimo) {
      advertencias.push(
        `La escala del Art. 225 daba ${calculadas.decimal.toFixed(2)} semanas; se aplicó el ` +
          `mínimo absoluto de ${minimo.decimal.toFixed(2)} semana(s).`,
      );
    }
    lineas.push({
      concepto: 'indemnizacion',
      base: salarioSemanal,
      tasa: semanas,
      monto: salarioSemanal.times(semanas).round(2),
      baseLegal: 'Código de Trabajo Art. 225 — escala progresiva por tramos de antigüedad',
    });
  }

  // --- Preaviso (Art. 212 / 222) ---
  if (insumo.semanasPreaviso !== null) {
    const semanas = Rate.of(insumo.semanasPreaviso);
    const aFavorDelTrabajador = !semanas.decimal.isNegative();
    lineas.push({
      concepto: aFavorDelTrabajador ? 'preaviso' : 'preaviso_a_cargo_trabajador',
      base: salarioSemanal,
      tasa: semanas,
      monto: salarioSemanal.times(semanas).round(2),
      baseLegal: aFavorDelTrabajador
        ? 'Código de Trabajo Art. 212 — preaviso no otorgado por el empleador'
        : 'Código de Trabajo Art. 222 — renuncia sin preaviso, 1 semana a cargo del trabajador',
    });
    if (!aFavorDelTrabajador) {
      advertencias.push(
        'El preaviso a cargo del trabajador (Art. 222) se muestra como resta de la liquidación. ' +
          'La consulta D5.c —si esa deducción está sujeta al tope del 50% del Art. 161— sigue ' +
          'abierta: aquí NO se le aplicó tope.',
      );
    }
  }

  advertencias.push(
    'El salario base de esta liquidación es el que entregó el llamador. La consulta D2 (🔴 ' +
      'crítica) sigue abierta: no está confirmado si debe ser el último devengado, el promedio ' +
      'de los últimos meses, o el más favorable al trabajador, ni si incluye horas extra y ' +
      'comisiones.',
  );
  advertencias.push(
    'Los montos se calculan sin redondear el salario semanal intermedio (ADR-006). El ejemplo ' +
      'de la base legal §8.3 sí lo redondea, lo que da unos centavos más: para 15 años sobre ' +
      'B/. 1,000 el documento llega a 9,000.81 y este motor a 9,000.69. Cuál acepta MITRADEL es ' +
      'la consulta F4, todavía sin responder.',
  );

  const total = lineas.reduce((acc, l) => acc.plus(l.monto), Money.ZERO);
  return { salarioSemanal, antiguedad, lineas, total, advertencias };
}
