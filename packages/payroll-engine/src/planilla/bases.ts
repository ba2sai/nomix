import { Money, Rate } from '../money.js';
import type { CatalogoConceptos, Concepto } from '../catalogo.js';

/**
 * Acumulación de bases de cálculo dirigida por la matriz de incidencia (ADR-002).
 *
 * Este es el módulo que sustituye al `if` cableado: no pregunta "¿es esto una
 * hora extra?", pregunta "¿este concepto declara que incide en CSS?". La
 * diferencia es que la respuesta vive en la base de datos y se corrige con un
 * INSERT cuando el asesor laboral responda una consulta abierta.
 */

/** Una línea de lo devengado en el período, ya convertida a monto. */
export interface LineaDevengada {
  readonly conceptoCodigo: string;
  readonly monto: Money;
  /** Horas o días de origen, si el concepto se capturó por cantidad. */
  readonly cantidad?: string | undefined;
}

/** Base de CSS agrupada por la tasa que le aplica. */
export interface GrupoCss {
  /** 'general' para la tasa ordinaria; la tasa en texto para los regímenes propios. */
  readonly clave: string;
  /** null = usar las tasas generales resueltas por fecha. */
  readonly tasaEspecial: Rate | null;
  readonly base: Money;
}

export interface Bases {
  /**
   * Bases de CSS por régimen de tasa. El XIII Mes cotiza al 7.25% y no puede
   * mezclarse con el salario al 9.75%: por eso es un mapa y no un escalar.
   */
  readonly css: ReadonlyMap<string, GrupoCss>;
  readonly seguroEducativo: Money;
  /** Los dos flujos paralelos que confirma el layout del Formulario 03 (doc 09 §2). */
  readonly isr: { readonly ordinario: Money; readonly gastosRepresentacion: Money };
  readonly xiii: Money;
  readonly promedioVacaciones: Money;
  readonly liquidacion: Money;
  /**
   * Códigos con `confianza !== 'verificado'` que participaron en este cálculo.
   * Sube hasta la UI para marcar el resultado como provisional: es más honesto
   * que presentar un número con certeza que la investigación legal no tiene.
   */
  readonly conceptosPendientes: readonly string[];
}

const CLAVE_GENERAL = 'general';

/**
 * El signo lo determina el TIPO del concepto, no su código. Así una ausencia
 * (deducción que sí incide en CSS) reduce la base cotizable sin necesidad de
 * un caso especial, y una retención (deducción que no incide) simplemente no
 * participa porque sus flags están en false.
 *
 * Los aportes patronales y las provisiones son RESULTADOS del cálculo, no
 * insumos: nunca entran en las bases del trabajador.
 */
function signo(c: Concepto): -1 | 0 | 1 {
  switch (c.tipo) {
    case 'ingreso':
      return 1;
    case 'deduccion':
      return -1;
    case 'aporte_patronal':
    case 'provision':
      return 0;
  }
}

function acumular(actual: Money, monto: Money, s: -1 | 1): Money {
  return s === 1 ? actual.plus(monto) : actual.minus(monto);
}

export function acumularBases(
  lineas: readonly LineaDevengada[],
  catalogo: CatalogoConceptos,
): Bases {
  const css = new Map<string, GrupoCss>();
  let seguroEducativo = Money.ZERO;
  let isrOrdinario = Money.ZERO;
  let isrGastosRep = Money.ZERO;
  let xiii = Money.ZERO;
  let promedioVacaciones = Money.ZERO;
  let liquidacion = Money.ZERO;
  const pendientes = new Set<string>();

  for (const linea of lineas) {
    const c = catalogo.get(linea.conceptoCodigo);
    const s = signo(c);
    if (s === 0) continue;

    if (c.confianza !== 'verificado') pendientes.add(c.codigo);

    if (c.incideCss) {
      const clave = c.tasaCssEspecial === null ? CLAVE_GENERAL : c.tasaCssEspecial.toPercentString();
      const previo = css.get(clave);
      css.set(clave, {
        clave,
        tasaEspecial: c.tasaCssEspecial,
        base: acumular(previo?.base ?? Money.ZERO, linea.monto, s),
      });
    }
    if (c.incideSeguroEducativo) seguroEducativo = acumular(seguroEducativo, linea.monto, s);
    if (c.incideIsr) {
      if (c.regimenIsr === 'gastos_representacion') {
        isrGastosRep = acumular(isrGastosRep, linea.monto, s);
      } else if (c.regimenIsr === 'ordinario') {
        isrOrdinario = acumular(isrOrdinario, linea.monto, s);
      }
      // 'exento' declara incidencia pero no suma en ninguna base gravable.
    }
    if (c.incideBaseXiii) xiii = acumular(xiii, linea.monto, s);
    if (c.incidePromedioVacaciones) {
      promedioVacaciones = acumular(promedioVacaciones, linea.monto, s);
    }
    if (c.incideBaseLiquidacion) liquidacion = acumular(liquidacion, linea.monto, s);
  }

  return {
    css,
    seguroEducativo,
    isr: { ordinario: isrOrdinario, gastosRepresentacion: isrGastosRep },
    xiii,
    promedioVacaciones,
    liquidacion,
    conceptosPendientes: [...pendientes].sort(),
  };
}

/** Base de CSS a la tasa general (la que usa `calcularSeguridadSocial`). */
export function baseCssGeneral(bases: Bases): Money {
  return bases.css.get(CLAVE_GENERAL)?.base ?? Money.ZERO;
}

/** Un grupo de CSS que sí tiene tasa propia — `tasaEspecial` nunca es null. */
export type GrupoCssEspecial = Omit<GrupoCss, 'tasaEspecial'> & { readonly tasaEspecial: Rate };

/**
 * Grupos de CSS con tasa propia (XIII y futuros regímenes especiales). El tipo
 * de retorno ya excluye el null, así que el llamador no necesita aserciones.
 */
export function gruposCssEspeciales(bases: Bases): readonly GrupoCssEspecial[] {
  const especiales: GrupoCssEspecial[] = [];
  for (const g of bases.css.values()) {
    if (g.tasaEspecial !== null) especiales.push({ ...g, tasaEspecial: g.tasaEspecial });
  }
  return especiales;
}
