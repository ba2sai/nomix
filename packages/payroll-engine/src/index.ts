// @nomix/payroll-engine — API pública del motor de cálculo.
//
// Este paquete NO importa nada del proyecto (salvo decimal.js). Recibe
// insumos y reglas ya resueltas, devuelve resultados con trazabilidad.
// Por eso corre igual en el servidor y en el navegador (ARCHITECTURE §2).

export { Money, Rate } from './money.js';
export {
  calcularSeguridadSocial,
  calcularCssTasaEspecial,
  type TasasSeguridadSocial,
  type ResultadoSeguridadSocial,
  type LineaCalculada,
} from './seguridad-social/css.js';

// Catálogo de conceptos — la matriz de incidencia como dato (ADR-002).
export {
  CatalogoConceptos,
  type Concepto,
  type TipoConcepto,
  type Unidad,
  type RegimenIsr,
  type Confianza,
} from './catalogo.js';

// Acumulación de bases dirigida por el catálogo.
export {
  acumularBases,
  baseCssGeneral,
  gruposCssEspeciales,
  type Bases,
  type GrupoCss,
  type GrupoCssEspecial,
  type LineaDevengada,
} from './planilla/bases.js';

// Devengo del período: prorrateo, horas y días.
export {
  devengarSalarioBase,
  devengarHoras,
  devengarDias,
  salarioHora,
  diasDelPeriodo,
  type MetodoProrrateo,
  type Periodo,
  type ParametrosDevengo,
} from './planilla/devengo.js';

// ISR — método acumulativo (ADR-014, base legal §4.5).
export {
  calcularImpuestoTramos,
  calcularIsrAcumulativo,
  type Tramo,
  type InsumoIsrAcumulativo,
} from './planilla/isr.js';
