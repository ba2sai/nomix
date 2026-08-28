import { Money, Rate } from '../money.js';

/**
 * Cálculo de Seguridad Social — CSS y Seguro Educativo (Panamá).
 *
 * Fuente normativa: docs/nomix/06_base_legal_panama.md §1 y §2.
 * Validado contra el asiento contable real de El Príncipe Azul, junio 2026
 * (docs/nomix/09_formatos_reales_planifacil.md §1).
 *
 * Las tasas NO viven aquí: llegan como parámetro, resueltas por la fecha del
 * período desde la configuración de reglas (ADR-001). Este módulo es una
 * función pura de (base, tasas) → resultado con trazabilidad (ADR-005).
 */

export interface TasasSeguridadSocial {
  /** CSS obrero — regla `css_obrero`. 2026: "0.0975". */
  cssObrero: Rate;
  /** CSS patronal — regla `css_patronal`. Abr-2025→Feb-2027: "0.1325" (Ley 462). */
  cssPatronal: Rate;
  /** Seguro Educativo obrero — regla `seguro_educativo_obrero`. "0.0125". */
  seObrero: Rate;
  /** Seguro Educativo patronal — regla `seguro_educativo_patronal`. "0.0150". */
  sePatronal: Rate;
  /** Riesgos Profesionales — por empresa según CIIU (0.0056–0.0625). Solo empleador. */
  riesgosProfesionales: Rate;
}

export interface LineaCalculada {
  readonly concepto: string;
  readonly base: Money;
  readonly tasa: Rate;
  readonly monto: Money;
  /** Trazabilidad (ADR-005): artículo/ley de origen. */
  readonly baseLegal: string;
}

export interface ResultadoSeguridadSocial {
  readonly cssObrero: LineaCalculada;
  readonly seObrero: LineaCalculada;
  readonly cssPatronal: LineaCalculada;
  readonly sePatronal: LineaCalculada;
  readonly riesgosProfesionales: LineaCalculada;
  /** Total retenido al trabajador (CSS + SE obrero). */
  readonly totalObrero: Money;
  /** Total de cargas patronales (CSS + SE patronal + RP). */
  readonly totalPatronal: Money;
}

/**
 * Calcula CSS y SE sobre la base cotizable.
 *
 * La base cotizable incluye salario ordinario, horas extra, comisiones,
 * bonificaciones y vacaciones; excluye gastos de representación, prima de
 * antigüedad e indemnización (base legal §1.3, doble-verificado jun-2026).
 * El XIII Mes cotiza aparte, a tasa 7.25% (ver módulo decimo).
 */
export function calcularSeguridadSocial(
  baseCotizable: Money,
  tasas: TasasSeguridadSocial,
  /**
   * Base del Seguro Educativo cuando difiere de la de CSS. Por defecto son la
   * misma, que es el caso del salario ordinario; las bases divergen cuando el
   * catálogo declara un concepto que cotiza CSS pero no SE (ADR-002).
   */
  baseSeguroEducativo: Money = baseCotizable,
): ResultadoSeguridadSocial {
  const cssObrero: LineaCalculada = {
    concepto: 'css_obrero',
    base: baseCotizable,
    tasa: tasas.cssObrero,
    monto: baseCotizable.times(tasas.cssObrero).round(2),
    baseLegal: 'Ley 51 de 2005 / Ley 462 de 2025',
  };
  const seObrero: LineaCalculada = {
    concepto: 'seguro_educativo_obrero',
    base: baseSeguroEducativo,
    tasa: tasas.seObrero,
    monto: baseSeguroEducativo.times(tasas.seObrero).round(2),
    baseLegal: 'Ley 13 de 1987',
  };
  const cssPatronal: LineaCalculada = {
    concepto: 'css_patronal',
    base: baseCotizable,
    tasa: tasas.cssPatronal,
    monto: baseCotizable.times(tasas.cssPatronal).round(2),
    baseLegal: 'Ley 462 de 2025',
  };
  const sePatronal: LineaCalculada = {
    concepto: 'seguro_educativo_patronal',
    base: baseSeguroEducativo,
    tasa: tasas.sePatronal,
    monto: baseSeguroEducativo.times(tasas.sePatronal).round(2),
    baseLegal: 'Ley 13 de 1987',
  };
  const riesgosProfesionales: LineaCalculada = {
    concepto: 'riesgos_profesionales',
    base: baseCotizable,
    tasa: tasas.riesgosProfesionales,
    monto: baseCotizable.times(tasas.riesgosProfesionales).round(2),
    baseLegal: 'Resolución JD-CSS 12,260-2024',
  };

  return {
    cssObrero,
    seObrero,
    cssPatronal,
    sePatronal,
    riesgosProfesionales,
    totalObrero: cssObrero.monto.plus(seObrero.monto),
    totalPatronal: cssPatronal.monto.plus(sePatronal.monto).plus(riesgosProfesionales.monto),
  };
}

/**
 * Cuota obrera de CSS sobre una base con régimen de tasa propio (ADR-002).
 *
 * El caso vivo es el XIII Mes, que cotiza al 7.25% y no al 9.75%. La tasa llega
 * desde el catálogo (`concepto.tasa_css_especial`), así que un régimen nuevo se
 * agrega con un INSERT y no toca este código.
 *
 * ⚠️ Deliberadamente NO calcula la cuota patronal: la consulta A7 del
 * cuestionario profesional ("cuota patronal sobre el XIII Mes") sigue abierta y
 * la base legal §3.3 no la fija. Inventar una tasa aquí produciría un número con
 * apariencia de certeza. Se añade cuando haya respuesta.
 */
export function calcularCssTasaEspecial(
  concepto: string,
  base: Money,
  tasa: Rate,
  baseLegal: string,
): LineaCalculada {
  return {
    concepto,
    base,
    tasa,
    monto: base.times(tasa).round(2),
    baseLegal,
  };
}
