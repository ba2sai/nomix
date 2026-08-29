import { Rate } from './money.js';
import type { CategoriaDescuento } from './planilla/descuentos.js';

/**
 * Catálogo de conceptos — la matriz de incidencia como DATO (ADR-002).
 *
 * El motor no sabe qué es "horas extra" ni qué es "gastos de representación".
 * Sabe leer los flags de un concepto y sumar en las bases que declaren `true`.
 * Añadir un concepto nuevo es un INSERT, no un cambio de código.
 *
 * Este módulo es puro: recibe las filas ya leídas de la base de datos y
 * resueltas por vigencia. No consulta nada.
 */

export type TipoConcepto = 'ingreso' | 'deduccion' | 'aporte_patronal' | 'provision';

/** Qué trae el movimiento: un importe, o una cantidad que el motor convierte. */
export type Unidad = 'monto' | 'horas' | 'dias';

/** Régimen de ISR aplicable. El Formulario 03 confirma dos flujos paralelos. */
export type RegimenIsr = 'ordinario' | 'gastos_representacion' | 'exento';

/** Nivel de certeza de la incidencia, heredado del vocabulario de `regla`. */
export type Confianza = 'verificado' | 'verificar' | 'pendiente';

export interface Concepto {
  readonly codigo: string;
  readonly nombre: string;
  readonly tipo: TipoConcepto;
  readonly unidad: Unidad;
  readonly incideCss: boolean;
  /** null = tasa general de CSS. Poblado = régimen propio (XIII al 7.25%). */
  readonly tasaCssEspecial: Rate | null;
  readonly incideSeguroEducativo: boolean;
  readonly incideIsr: boolean;
  readonly regimenIsr: RegimenIsr;
  readonly incideBaseXiii: boolean;
  readonly incidePromedioVacaciones: boolean;
  readonly incideBaseLiquidacion: boolean;
  readonly esInembargable: boolean;
  /**
   * Régimen frente a los topes del Art. 161 (ADR-004). `null` en todo lo que no
   * es un descuento de acreedor, incluidas las retenciones de ley.
   */
  readonly categoriaDescuento: CategoriaDescuento | null;
  /** Artículo/ley que sustenta la incidencia. Va a la traza (ADR-005). */
  readonly baseLegal: string;
  readonly confianza: Confianza;
}

/**
 * Lookup por código. Falla ruidosamente ante un concepto desconocido: un
 * default silencioso sobre la matriz de incidencia produce planillas mal
 * calculadas que nadie detecta hasta el rechazo de la CSS.
 */
export class CatalogoConceptos {
  private readonly porCodigo: ReadonlyMap<string, Concepto>;

  constructor(conceptos: readonly Concepto[]) {
    const mapa = new Map<string, Concepto>();
    for (const c of conceptos) {
      if (mapa.has(c.codigo)) {
        throw new Error(
          `Concepto '${c.codigo}' duplicado en el catálogo. ` +
            `La resolución por vigencia debe dejar una sola versión por código.`,
        );
      }
      mapa.set(c.codigo, c);
    }
    this.porCodigo = mapa;
  }

  get(codigo: string): Concepto {
    const c = this.porCodigo.get(codigo);
    if (!c) {
      throw new Error(
        `Concepto '${codigo}' no está en el catálogo vigente. ` +
          `Siémbralo en la tabla \`concepto\` con su base legal e incidencia (ADR-002).`,
      );
    }
    return c;
  }

  tiene(codigo: string): boolean {
    return this.porCodigo.has(codigo);
  }

  todos(): readonly Concepto[] {
    return [...this.porCodigo.values()];
  }
}
