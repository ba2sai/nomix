import { Money, Rate } from '../money.js';
import type { LineaCalculada } from '../seguridad-social/css.js';

/**
 * Décimo Tercer Mes (base legal §3).
 *
 * Fuente normativa: Decreto de Gabinete N° 221 de 18 de noviembre de 1971,
 * reglamentado por el Decreto N° 19 de 7 de septiembre de 1973 (Gaceta Oficial
 * N° 17,436), leído del facsímil oficial — es la interpretación vinculante.
 *
 * Tres reglas del Decreto 19 que este módulo implementa literalmente:
 *
 *  - **Art. 4º** — la partida se calcula sobre el promedio de los salarios
 *    PERCIBIDOS en su período: salario base, jornadas extraordinarias, recargos,
 *    comisiones, primas, licencias pagadas, vacaciones, permisos remunerados y
 *    bonificaciones. Este módulo no decide cuáles entran: recibe la base ya
 *    acumulada por `acumularBases` según la matriz de incidencia (ADR-002).
 *    Nomix NO ofrece el modo "solo salario base" de PlaniFácil: viola el Art. 4º.
 *  - **Art. 3º** — la 3ª partida se compara contra el aguinaldo pactado o
 *    acostumbrado y se paga la suma más favorable al trabajador.
 *  - **Art. 5º** — piso irrenunciable: una sobrescritura por empresa (convenio
 *    colectivo) solo vale si mejora el resultado de la regla general. La
 *    sobrescritura es unidireccional, y aquí se valida en vez de asumirse.
 *
 * Ni las fechas de las partidas ni el divisor están cableados: llegan como
 * parámetros resueltos por vigencia desde `regla` (ADR-001).
 */

/** Una partida del ciclo anual. Las fechas son 'MM-DD': se repiten cada año. */
export interface DefinicionPartida {
  /** 1, 2 o 3 — el orden de pago dentro del año. */
  readonly numero: number;
  /** Inicio del período de acumulación, 'MM-DD'. */
  readonly desde: string;
  /** Fin del período de acumulación, 'MM-DD' (inclusivo, y fecha de pago). */
  readonly hasta: string;
}

/** La partida ya anclada a un año concreto del calendario. */
export interface VentanaPartida {
  readonly numero: number;
  /** 'YYYY-MM-DD' */
  readonly desde: string;
  /** 'YYYY-MM-DD' */
  readonly hasta: string;
}

const RE_MMDD = /^\d{2}-\d{2}$/;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** ¿La partida cruza el fin de año? (16-dic → 15-abr sí; 16-abr → 15-ago no). */
function cruzaAnio(p: DefinicionPartida): boolean {
  return p.desde > p.hasta;
}

/** Ancla la partida al año en que TERMINA (que es el año en que se paga). */
function anclar(p: DefinicionPartida, anioDePago: number): VentanaPartida {
  const anioInicio = cruzaAnio(p) ? anioDePago - 1 : anioDePago;
  return {
    numero: p.numero,
    desde: `${String(anioInicio)}-${p.desde}`,
    hasta: `${String(anioDePago)}-${p.hasta}`,
  };
}

/**
 * Resuelve a qué partida pertenece `fecha` y devuelve su ventana de acumulación
 * en fechas absolutas.
 *
 * La ventana la manda el Decreto, no lo que el usuario escribió en la cabecera
 * de la planilla: si alguien crea la planilla de la 1ª partida con período
 * "01-ene → 15-abr", la acumulación sigue arrancando el 16 de diciembre. El
 * llamador compara ambas y avisa de la diferencia (`ProcesoService`).
 */
export function resolverPartida(
  fecha: string,
  partidas: readonly DefinicionPartida[],
): VentanaPartida {
  if (!RE_FECHA.test(fecha)) {
    throw new TypeError(`Fecha inválida '${fecha}'. Se espera YYYY-MM-DD.`);
  }
  for (const p of partidas) {
    if (!RE_MMDD.test(p.desde) || !RE_MMDD.test(p.hasta)) {
      throw new TypeError(
        `Partida ${String(p.numero)} con fechas inválidas (${p.desde}..${p.hasta}). Se espera MM-DD.`,
      );
    }
  }

  const anio = Number(fecha.slice(0, 4));
  const mmdd = fecha.slice(5);
  const encontradas = partidas.filter((p) =>
    cruzaAnio(p) ? mmdd >= p.desde || mmdd <= p.hasta : mmdd >= p.desde && mmdd <= p.hasta,
  );

  if (encontradas.length === 0) {
    throw new Error(
      `Ninguna partida del XIII cubre ${fecha}. Las partidas vigentes deben cubrir el año completo.`,
    );
  }
  if (encontradas.length > 1) {
    const nums = encontradas.map((p) => String(p.numero)).join(', ');
    throw new Error(`Las partidas ${nums} del XIII se solapan en ${fecha}.`);
  }

  const p = encontradas[0] as DefinicionPartida;
  // En una partida que cruza el año, una fecha del tramo inicial (17-dic)
  // pertenece a la partida que se PAGA el año siguiente.
  return anclar(p, cruzaAnio(p) && mmdd >= p.desde ? anio + 1 : anio);
}

export interface InsumoPartidaXiii {
  /**
   * Σ de los salarios percibidos en la ventana, ya filtrada por la matriz de
   * incidencia (`Bases.xiii`). Un colaborador que entró a mitad del período
   * acumula menos por construcción: el tiempo de servicio del Art. 2º del
   * Decreto 221 no necesita prorrateo aparte.
   */
  readonly salariosDelPeriodo: Money;
  /** Divisor de la partida — regla `divisor_xiii` ("12", base legal §3.2). */
  readonly divisor: string;
  /**
   * Divisor de la regla GENERAL del país, cuando la empresa lo sobrescribe.
   * Habilita el control del Art. 5º. `null` = no hay sobrescritura que validar.
   */
  readonly divisorGeneral: string | null;
  /**
   * Aguinaldo o bonificación de Navidad pactada o acostumbrada (Art. 3º).
   * Solo tiene sentido en la 3ª partida; `null` en las otras dos.
   */
  readonly aguinaldoAcostumbrado: Money | null;
  readonly partida: VentanaPartida;
  /** Número de la última partida del ciclo — la que compite con el aguinaldo. */
  readonly ultimaPartida: number;
  readonly concepto: string;
  readonly baseLegal: string;
}

/** Qué regla terminó fijando el monto. Sube a la UI y a la traza (ADR-005). */
export type ReglaPartida = 'formula' | 'aguinaldo' | 'piso_general';

export interface ResultadoPartidaXiii {
  readonly linea: LineaCalculada;
  /** Lo que da la fórmula del Art. 4º con el divisor aplicado, sin los pisos. */
  readonly porFormula: Money;
  readonly reglaAplicada: ReglaPartida;
  /**
   * Hallazgos que el usuario tiene que ver: un convenio que empeoraba el XIII,
   * un aguinaldo que sustituyó a la partida. Nunca se resuelven en silencio.
   */
  readonly advertencias: readonly string[];
}

/**
 * Calcula una partida del XIII Mes para un colaborador.
 *
 *   partida = Σ(salarios de la ventana) ÷ divisor        (Art. 4º)
 *   partida = MAX(partida, partida con el divisor general) (Art. 5º)
 *   3ª partida = MAX(partida, aguinaldo acostumbrado)      (Art. 3º)
 *
 * El divisor es 12 aunque la ventana cubra 4 meses: es la fracción anual de un
 * mes de salario repartida en tres pagos (base legal §3.2, confirmado por dos
 * vías). Y las tres comparaciones son `MAX` porque el Decreto solo admite
 * desviaciones a favor del trabajador.
 */
export function calcularPartidaXiii(insumo: InsumoPartidaXiii): ResultadoPartidaXiii {
  const porFormula = insumo.salariosDelPeriodo.dividedBy(insumo.divisor);
  const advertencias: string[] = [];
  let monto = porFormula;
  let reglaAplicada: ReglaPartida = 'formula';

  // Art. 5º — el convenio colectivo no puede empeorar la regla general.
  if (insumo.divisorGeneral !== null && insumo.divisorGeneral !== insumo.divisor) {
    const porReglaGeneral = insumo.salariosDelPeriodo.dividedBy(insumo.divisorGeneral);
    if (porReglaGeneral.greaterThan(monto)) {
      advertencias.push(
        `La sobrescritura de empresa (divisor ${insumo.divisor}) daba un XIII menor que la ` +
          `regla general (divisor ${insumo.divisorGeneral}). Se aplicó la regla general: el ` +
          `Art. 5º del Decreto 19 de 1973 solo admite desviaciones a favor del trabajador.`,
      );
      monto = porReglaGeneral;
      reglaAplicada = 'piso_general';
    }
  }

  // Art. 3º — el aguinaldo acostumbrado compite con la última partida.
  if (insumo.aguinaldoAcostumbrado !== null) {
    if (insumo.partida.numero !== insumo.ultimaPartida) {
      throw new Error(
        `El aguinaldo acostumbrado solo compite con la ${String(insumo.ultimaPartida)}ª partida ` +
          `(Art. 3º del Decreto 19 de 1973); se recibió en la ${String(insumo.partida.numero)}ª. ` +
          `Las otras partidas se pagan completas e íntegras.`,
      );
    }
    if (insumo.aguinaldoAcostumbrado.greaterThan(monto)) {
      advertencias.push(
        `Se pagó el aguinaldo acostumbrado (B/. ${insumo.aguinaldoAcostumbrado.toFixed2()}) en vez ` +
          `de la partida calculada (B/. ${monto.toFixed2()}): el Art. 3º obliga a la suma más ` +
          `favorable al trabajador. Quedan abiertas dos preguntas de la consulta B2-bis: si la ` +
          `comparación es contra esta partida o contra el XIII completo del año, y si el ` +
          `aguinaldo que gana cotiza CSS al 7.25% del XIII o al 9.75% ordinario. Nomix lo trata ` +
          `como la partida a la que sustituye.`,
      );
      monto = insumo.aguinaldoAcostumbrado;
      reglaAplicada = 'aguinaldo';
    }
  }

  return {
    porFormula,
    reglaAplicada,
    advertencias,
    linea: {
      concepto: insumo.concepto,
      base: insumo.salariosDelPeriodo,
      // Proporción efectiva sobre la base del período. Con la fórmula pura es
      // exactamente 1/divisor (8.3333%); con el aguinaldo, lo que resultó.
      tasa: insumo.salariosDelPeriodo.isZero()
        ? Rate.of('1').dividedBy(insumo.divisor)
        : Rate.of(monto.toString()).dividedBy(insumo.salariosDelPeriodo.toString()),
      monto: monto.round(2),
      baseLegal: insumo.baseLegal,
    },
  };
}
