/**
 * Siembra del catálogo de conceptos (ADR-002) y de las reglas de devengo.
 *
 * Fuente: `docs/nomix/06_base_legal_panama.md` §1.3, §5 y §13, más la matriz de
 * `docs/nomix/05_especificacion_pendiente_motor_planilla.md` §1.1 y la
 * validación contra producción de `docs/nomix/09_formatos_reales_planifacil.md`.
 *
 * Sobre `confianza`: describe la incidencia de este concepto en las bases que el
 * motor HOY calcula y persiste — CSS, Seguro Educativo, régimen de ISR y base
 * del XIII. Las bases que todavía no se construyen (promedio de vacaciones y
 * base de liquidación) arrastran consultas abiertas propias — sobre todo la D2
 * 🔴 "salario base de indemnización y prima" — y sus flags aquí son la lectura
 * preliminar, no una respuesta verificada. Cuando el asesor laboral responda el
 * Bloque B1, esto es un INSERT con nueva vigencia, no un refactor.
 */
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { schema } from '@nomix/db';

/** Fila del catálogo. Los flags se nombran igual que las columnas. */
interface FilaConcepto {
  codigo: string;
  nombre: string;
  tipo: 'ingreso' | 'deduccion' | 'aporte_patronal' | 'provision';
  unidad: 'monto' | 'horas' | 'dias';
  css: boolean;
  tasaCssEspecial: string | null;
  se: boolean;
  isr: boolean;
  regimenIsr: 'ordinario' | 'gastos_representacion' | 'exento';
  xiii: boolean;
  vacaciones: boolean;
  liquidacion: boolean;
  inembargable: boolean;
  /** Régimen frente a los topes del Art. 161 (ADR-004). null = no es descuento de acreedor. */
  categoriaDescuento?: 'pension_alimenticia' | 'vivienda' | 'ordinario' | undefined;
  baseLegal: string;
  confianza: 'verificado' | 'verificar' | 'pendiente';
}

/** Atajo: cotiza CSS y SE y grava ISR por el régimen ordinario. */
const COTIZA = { css: true, se: true, isr: true, regimenIsr: 'ordinario' } as const;
/** Atajo: no cotiza ni grava. */
const NO_COTIZA = { css: false, se: false, isr: false, regimenIsr: 'exento' } as const;
const SIN_TASA_ESPECIAL = { tasaCssEspecial: null } as const;

const CONCEPTOS: FilaConcepto[] = [
  // ── Ingresos ordinarios ─────────────────────────────────────────────────
  {
    codigo: 'salario_ordinario', nombre: 'Salario ordinario', tipo: 'ingreso', unidad: 'monto',
    ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: true, inembargable: false,
    baseLegal: 'Código de Trabajo Art. 140; Ley 51 de 2005; Decreto 19 de 1973 Art. 4º',
    confianza: 'verificado',
  },
  {
    codigo: 'comisiones', nombre: 'Comisiones', tipo: 'ingreso', unidad: 'monto',
    ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: true, inembargable: false,
    baseLegal: 'Decreto 19 de 1973 Art. 4º; base legal §1.3 (cotiza CSS)',
    confianza: 'verificado',
  },
  {
    codigo: 'bonificaciones', nombre: 'Bonificaciones e incentivos', tipo: 'ingreso', unidad: 'monto',
    ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: true, inembargable: false,
    baseLegal: 'Decreto 19 de 1973 Art. 4º (bonificaciones); base legal §1.3',
    confianza: 'verificado',
  },
  {
    codigo: 'primas', nombre: 'Prima de producción', tipo: 'ingreso', unidad: 'monto',
    ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: true, inembargable: false,
    baseLegal: 'Decreto 19 de 1973 Art. 4º (primas) — incidencia CSS por asimilación a salario',
    confianza: 'verificar',
  },
  {
    codigo: 'vacaciones_pagadas', nombre: 'Vacaciones pagadas', tipo: 'ingreso', unidad: 'monto',
    ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true,
    // No promedia sobre sí misma: el promedio de vacaciones se calcula sobre lo
    // devengado en los 11 meses trabajados.
    vacaciones: false, liquidacion: true, inembargable: true,
    baseLegal: 'Código de Trabajo Art. 54-62; Art. 161 (inembargable); asiento real jun-2026',
    confianza: 'verificado',
  },
  {
    codigo: 'permisos_remunerados', nombre: 'Permisos remunerados', tipo: 'ingreso', unidad: 'monto',
    ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: true, inembargable: false,
    baseLegal: 'Decreto 19 de 1973 Art. 4º (permisos remunerados)',
    confianza: 'verificado',
  },
  {
    codigo: 'licencia_enfermedad_empleador', nombre: 'Licencia por enfermedad (porción del empleador)',
    tipo: 'ingreso', unidad: 'monto', ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: false, inembargable: false,
    baseLegal: 'Decreto 19 de 1973 Art. 4º; base legal §7.2 (solo la porción del empleador)',
    confianza: 'verificado',
  },

  // ── Recargos y horas extra (unidad: horas) ──────────────────────────────
  // CSS y SE doble-verificados contra el asiento real de jun-2026; entran al
  // XIII por la lista taxativa del Decreto 19 de 1973 Art. 4º.
  {
    codigo: 'extra_diurna', nombre: 'Hora extra diurna (+25%)', tipo: 'ingreso', unidad: 'horas',
    ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: false, inembargable: false,
    baseLegal: 'Código de Trabajo Art. 33; asiento real jun-2026 (cotiza CSS y SE)',
    confianza: 'verificado',
  },
  {
    codigo: 'extra_nocturna', nombre: 'Hora extra nocturna (+50%)', tipo: 'ingreso', unidad: 'horas',
    ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: false, inembargable: false,
    baseLegal: 'Código de Trabajo Art. 33; asiento real jun-2026',
    confianza: 'verificado',
  },
  {
    codigo: 'extra_prolonga_mixta_diurna', nombre: 'Extra que prolonga jornada mixta diurna (+50%)',
    tipo: 'ingreso', unidad: 'horas', ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: false, inembargable: false,
    baseLegal: 'Código de Trabajo Art. 33',
    confianza: 'verificado',
  },
  {
    codigo: 'extra_prolonga_nocturna', nombre: 'Extra que prolonga jornada nocturna (+75%)',
    tipo: 'ingreso', unidad: 'horas', ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: false, inembargable: false,
    baseLegal: 'Código de Trabajo Art. 33',
    confianza: 'verificado',
  },
  {
    codigo: 'extra_mixta_inicio_nocturno', nombre: 'Extra en jornada mixta de inicio nocturno (+75%)',
    tipo: 'ingreso', unidad: 'horas', ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: false, inembargable: false,
    baseLegal: 'Código de Trabajo Art. 33',
    confianza: 'verificado',
  },
  {
    codigo: 'recargo_domingo', nombre: 'Recargo por domingo / descanso semanal (+50%)',
    tipo: 'ingreso', unidad: 'horas', ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: false, inembargable: false,
    baseLegal: 'Código de Trabajo Art. 48',
    confianza: 'verificado',
  },
  {
    codigo: 'recargo_feriado', nombre: 'Recargo por día de fiesta o duelo (+150%)',
    tipo: 'ingreso', unidad: 'horas', ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: false, inembargable: false,
    baseLegal: 'Código de Trabajo Art. 49 — el recargo INCLUYE el pago del día',
    confianza: 'verificado',
  },

  // ── Ingresos que NO cotizan ─────────────────────────────────────────────
  {
    codigo: 'gastos_representacion', nombre: 'Gastos de representación', tipo: 'ingreso', unidad: 'monto',
    css: false, ...SIN_TASA_ESPECIAL, se: false,
    isr: true, regimenIsr: 'gastos_representacion',
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    baseLegal: 'Art. 701 lit. l CF (Ley 8 de 2010) — escala propia; base legal §1.3 (no cotiza)',
    confianza: 'verificado',
  },
  {
    codigo: 'viaticos', nombre: 'Viáticos', tipo: 'ingreso', unidad: 'monto',
    ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    baseLegal: 'Base legal §1.3 (viáticos no cotizables) — tratamiento de ISR sin confirmar',
    confianza: 'verificar',
  },
  {
    codigo: 'gastos_reembolsables', nombre: 'Gastos reembolsables', tipo: 'ingreso', unidad: 'monto',
    ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    baseLegal: 'Base legal §1.3 — reembolso de gasto, no es salario',
    confianza: 'verificado',
  },
  {
    codigo: 'prima_antiguedad', nombre: 'Prima de antigüedad', tipo: 'ingreso', unidad: 'monto',
    css: false, ...SIN_TASA_ESPECIAL, se: false, isr: true, regimenIsr: 'exento',
    xiii: false, vacaciones: false, liquidacion: false, inembargable: true,
    baseLegal: 'Código de Trabajo Art. 224; Art. 708 lit. y CF (exención con tope ⚠️ sin confirmar)',
    confianza: 'verificar',
  },
  {
    codigo: 'indemnizacion', nombre: 'Indemnización por despido', tipo: 'ingreso', unidad: 'monto',
    css: false, ...SIN_TASA_ESPECIAL, se: false, isr: true, regimenIsr: 'exento',
    xiii: false, vacaciones: false, liquidacion: false, inembargable: true,
    baseLegal: 'Código de Trabajo Art. 225; Art. 708 lit. y CF; Art. 161 (inembargable)',
    confianza: 'verificar',
  },
  {
    codigo: 'subsidio_incapacidad_css', nombre: 'Subsidio de incapacidad (CSS)', tipo: 'ingreso', unidad: 'monto',
    ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    baseLegal: 'Base legal §7.1-7.2 — no es salario; consulta C1 abierta (fuentes contradictorias)',
    confianza: 'verificar',
  },
  {
    codigo: 'xiii_mes', nombre: 'Décimo Tercer Mes', tipo: 'ingreso', unidad: 'monto',
    // El caso que justifica `tasa_css_especial`: cotiza al 7.25% y no al 9.75%,
    // y NO cotiza Seguro Educativo.
    css: true, tasaCssEspecial: '0.072500', se: false, isr: true, regimenIsr: 'ordinario',
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    baseLegal: 'Decreto 19 de 1973; base legal §3.3 — CSS obrero 7.25%, SE 0%',
    confianza: 'verificado',
  },

  // ── Deducciones al trabajador ───────────────────────────────────────────
  {
    codigo: 'css_obrero', nombre: 'Cuota obrera CSS', tipo: 'deduccion', unidad: 'monto',
    ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    baseLegal: 'Ley 51 de 2005 / Ley 462 de 2025',
    confianza: 'verificado',
  },
  {
    codigo: 'css_obrero_tasa_especial', nombre: 'Cuota obrera CSS (régimen de tasa propia)',
    tipo: 'deduccion', unidad: 'monto', ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    baseLegal: 'Decreto 19 de 1973; base legal §3.3 — cuota sobre bases con tasa propia (XIII al 7.25%)',
    confianza: 'verificado',
  },
  {
    codigo: 'seguro_educativo_obrero', nombre: 'Seguro Educativo obrero', tipo: 'deduccion', unidad: 'monto',
    ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    baseLegal: 'Ley 13 de 1987',
    confianza: 'verificado',
  },
  {
    codigo: 'isr_retencion', nombre: 'Retención de ISR', tipo: 'deduccion', unidad: 'monto',
    ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    baseLegal: 'Art. 700 CF — método acumulativo (ADR-014; la ley no prescribe el método, consulta A1)',
    confianza: 'verificado',
  },
  {
    codigo: 'isr_retencion_gastos_representacion',
    nombre: 'Retención de ISR sobre gastos de representación',
    tipo: 'deduccion', unidad: 'monto', ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    baseLegal: 'Art. 701 lit. l CF (Ley 8 de 2010) — escala propia, método acumulativo (ADR-014)',
    confianza: 'verificado',
  },
  {
    codigo: 'descuento_ausencia', nombre: 'Descuento por ausencia', tipo: 'deduccion', unidad: 'dias',
    // Incide en CSS/SE con signo negativo: la base cotizable es el salario
    // efectivamente devengado, no el contratado.
    ...COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: true, vacaciones: true, liquidacion: false, inembargable: false,
    baseLegal: 'Código de Trabajo Art. 140 — la base es el salario devengado',
    confianza: 'verificar',
  },
  {
    codigo: 'adelanto', nombre: 'Adelanto de salario', tipo: 'deduccion', unidad: 'monto',
    ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    categoriaDescuento: 'ordinario',
    baseLegal: 'Código de Trabajo Art. 161 — sujeto al tope global del 50%',
    confianza: 'verificado',
  },
  {
    codigo: 'prestamo', nombre: 'Descuento por préstamo', tipo: 'deduccion', unidad: 'monto',
    ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    categoriaDescuento: 'ordinario',
    baseLegal: 'Código de Trabajo Art. 161 — sujeto al tope global del 50%',
    confianza: 'verificado',
  },
  {
    codigo: 'pension_alimenticia', nombre: 'Pensión alimenticia', tipo: 'deduccion', unidad: 'monto',
    ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false,
    // `es_inembargable` califica INGRESOS que no se pueden embargar. La pensión
    // alimenticia es una deducción exenta del tope del 50%, que es otra cosa:
    // se modela con el algoritmo de asignación restringida del ADR-004.
    inembargable: false,
    categoriaDescuento: 'pension_alimenticia',
    baseLegal: 'Código de Trabajo Art. 161 — exenta del tope del 50% (ver ADR-004)',
    confianza: 'verificado',
  },

  {
    codigo: 'cuota_vivienda', nombre: 'Cuota de compra de vivienda', tipo: 'deduccion', unidad: 'monto',
    ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    // El único descuento con tope PROPIO además del global (Art. 161).
    categoriaDescuento: 'vivienda',
    baseLegal: 'Código de Trabajo Art. 161 — cuotas por compra de vivienda, tope 30% (ADR-004)',
    confianza: 'verificado',
  },

  // ── Aportes patronales (resultados del cálculo, nunca insumos) ───────────
  {
    codigo: 'css_patronal', nombre: 'Cuota patronal CSS', tipo: 'aporte_patronal', unidad: 'monto',
    ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    baseLegal: 'Ley 462 de 2025 — 13.25% desde abr-2025',
    confianza: 'verificado',
  },
  {
    codigo: 'seguro_educativo_patronal', nombre: 'Seguro Educativo patronal', tipo: 'aporte_patronal', unidad: 'monto',
    ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    baseLegal: 'Ley 13 de 1987',
    confianza: 'verificado',
  },
  {
    codigo: 'riesgos_profesionales', nombre: 'Riesgos Profesionales', tipo: 'aporte_patronal', unidad: 'monto',
    ...NO_COTIZA, ...SIN_TASA_ESPECIAL,
    xiii: false, vacaciones: false, liquidacion: false, inembargable: false,
    baseLegal: 'Resolución JD-CSS 12,260-2024 — tarifa por CIIU, solo empleador',
    confianza: 'verificado',
  },
];

/**
 * Factores de recargo y divisores. Van en `regla` y no en el catálogo porque
 * son valores CON VIGENCIA (ADR-001): el catálogo declara la incidencia, la
 * regla declara el número. Se guardan bajo la clave `tasa` para que los resuelva
 * el mismo `resolverTasa` que ya usan las tasas de seguridad social.
 *
 * Convención de nombres: `factor_<codigo del concepto>`. Así el motor deriva el
 * código de regla del concepto sin una tabla de correspondencia.
 */
const REGLAS_DEVENGO: ReadonlyArray<{
  codigo: string; valor: string; desde: string; baseLegal: string;
  confianza: 'verificado' | 'verificar' | 'pendiente';
}> = [
  { codigo: 'factor_extra_diurna', valor: '0.25', desde: '1972-01-01', baseLegal: 'Código de Trabajo Art. 33', confianza: 'verificado' },
  { codigo: 'factor_extra_nocturna', valor: '0.50', desde: '1972-01-01', baseLegal: 'Código de Trabajo Art. 33', confianza: 'verificado' },
  { codigo: 'factor_extra_prolonga_mixta_diurna', valor: '0.50', desde: '1972-01-01', baseLegal: 'Código de Trabajo Art. 33', confianza: 'verificado' },
  { codigo: 'factor_extra_prolonga_nocturna', valor: '0.75', desde: '1972-01-01', baseLegal: 'Código de Trabajo Art. 33', confianza: 'verificado' },
  { codigo: 'factor_extra_mixta_inicio_nocturno', valor: '0.75', desde: '1972-01-01', baseLegal: 'Código de Trabajo Art. 33', confianza: 'verificado' },
  { codigo: 'factor_recargo_domingo', valor: '0.50', desde: '1972-01-01', baseLegal: 'Código de Trabajo Art. 48', confianza: 'verificado' },
  { codigo: 'factor_recargo_feriado', valor: '1.50', desde: '1972-01-01', baseLegal: 'Código de Trabajo Art. 49', confianza: 'verificado' },
  // ❓ PENDIENTE (base legal §12.1): ¿/30, /días del mes, o ×12/365? Se siembra
  // /30 como supuesto declarado. Corregirlo es un INSERT con nueva vigencia.
  { codigo: 'divisor_salario_diario', valor: '30', desde: '1972-01-01', baseLegal: 'Convención de mercado — base legal §12.1 marca el divisor como PENDIENTE', confianza: 'pendiente' },
  // El divisor del XIII es 12 aunque cada partida cubra 4 meses: es la fracción
  // anual de un mes de salario repartida en tres pagos (base legal §3.2,
  // confirmado por dos vías). Va en `regla` y no cableado para que un convenio
  // colectivo pueda sobrescribirlo — solo a favor del trabajador, Art. 5º.
  { codigo: 'divisor_xiii', valor: '12', desde: '1972-01-01', baseLegal: 'Decreto de Gabinete 221 de 1971; Decreto 19 de 1973 Art. 4º', confianza: 'verificado' },
  // Art. 54: "30 días por cada 11 meses" ≡ "1 día por cada 11 días trabajados"
  // (consulta B4, base legal §6) SOLO bajo la convención de mes de 30 días que
  // ya usa `divisor_salario_diario` — que está en 'pendiente'. Este valor
  // hereda esa incertidumbre: se declara 'verificar', no 'verificado' (ADR-016).
  { codigo: 'tope_descuento_global', valor: '0.50', desde: '1972-01-01', baseLegal: 'Código de Trabajo Art. 161 — tope global del 50% del salario en dinero', confianza: 'verificado' },
  { codigo: 'tope_descuento_vivienda', valor: '0.30', desde: '1972-01-01', baseLegal: 'Código de Trabajo Art. 161 — cuotas de compra de vivienda', confianza: 'verificado' },
  // Divisor semanal para prima e indemnización. La consulta D2.c pide confirmar
  // que 4.333 sea el aceptado ante MITRADEL: se siembra como 'verificar'.
  { codigo: 'divisor_salario_semanal', valor: '4.333', desde: '1972-01-01', baseLegal: 'Convención de mercado — consulta D2.c sin responder', confianza: 'verificar' },
  { codigo: 'semanas_prima_antiguedad', valor: '1', desde: '1972-01-01', baseLegal: 'Código de Trabajo Art. 224 — 1 semana por año laborado', confianza: 'verificado' },
  { codigo: 'semanas_minimas_indemnizacion', valor: '1', desde: '1995-08-12', baseLegal: 'Código de Trabajo Art. 225 (Ley 44 de 1995) — mínimo absoluto', confianza: 'verificado' },
  { codigo: 'divisor_vacaciones', valor: '11', desde: '1972-01-01', baseLegal: 'Código de Trabajo Art. 54 — equivalencia con el divisor diario sin verificar (consulta B4, ADR-016)', confianza: 'verificar' },
];

/**
 * Ciclo de partidas del XIII Mes (base legal §3.1). Las fechas son 'MM-DD': se
 * repiten cada año, y la 1ª cruza el fin de año (16-dic → 15-abr). Como las
 * tablas de tramos, `valor` es un ARRAY jsonb; lo lee `resolverLista`.
 */
const CICLO_XIII: ReadonlyArray<{ numero: number; desde: string; hasta: string }> = [
  { numero: 1, desde: '12-16', hasta: '04-15' },
  { numero: 2, desde: '04-16', hasta: '08-15' },
  { numero: 3, desde: '08-16', hasta: '12-15' },
];

/**
 * Tablas de tramos progresivos (ISR y gastos de representación). `valor` es un
 * ARRAY jsonb `[{ hasta, tasa, baseFija }]`, no el escalar `{ tasa }` que usan
 * las reglas de arriba — `resolverTramos` sabe leer esta forma.
 */
const TABLAS_TRAMOS: ReadonlyArray<{
  codigo: string; desde: string; baseLegal: string;
  tramos: ReadonlyArray<{ hasta: string | null; tasa: string; baseFija: string }>;
}> = [
  {
    codigo: 'isr_tramos', desde: '1972-01-01', baseLegal: 'Art. 700 CF',
    tramos: [
      { hasta: '11000.00', tasa: '0', baseFija: '0' },
      { hasta: '50000.00', tasa: '0.15', baseFija: '0' },
      { hasta: null, tasa: '0.25', baseFija: '5850.00' },
    ],
  },
  {
    codigo: 'isr_gastos_representacion_tramos', desde: '1972-01-01',
    baseLegal: 'Art. 701 lit. l CF (Ley 8 de 2010)',
    tramos: [
      { hasta: '25000.00', tasa: '0.10', baseFija: '0' },
      { hasta: null, tasa: '0.15', baseFija: '2500.00' },
    ],
  },
];

/**
 * Escala de indemnización del Art. 225 (base legal §8.3). Vigente desde la Ley
 * 44 de 1995. Va en `regla` con esa fecha —y no cableada— porque el propio Art.
 * 225 conserva escalas para relaciones anteriores al 2 de abril de 1972 y un
 * régimen intermedio: cuando haya que soportarlos son filas con otra vigencia,
 * no un `if` por fecha de ingreso (ADR-001).
 */
const ESCALA_INDEMNIZACION: ReadonlyArray<{ hastaAnios: number | null; semanasPorAnio: string }> = [
  { hastaAnios: 10, semanasPorAnio: '3.4' },
  { hastaAnios: null, semanasPorAnio: '1' },
];

export async function sembrarConceptos(db: PostgresJsDatabase<typeof schema>): Promise<void> {
  // Idempotente: se borran las filas generales del país y se reinsertan. Los
  // overrides por empresa (empresa_id no nulo) no se tocan.
  await db.execute(sql`delete from concepto where empresa_id is null and jurisdiccion_id = 'PA'`);

  for (const c of CONCEPTOS) {
    await db.execute(sql`
      insert into concepto (
        jurisdiccion_id, empresa_id, codigo, nombre, tipo, unidad,
        incide_css, tasa_css_especial, incide_seguro_educativo,
        incide_isr, regimen_isr, incide_base_xiii,
        incide_promedio_vacaciones, incide_base_liquidacion, es_inembargable,
        categoria_descuento, base_legal, confianza, vigente_desde, vigente_hasta
      ) values (
        'PA', null, ${c.codigo}, ${c.nombre}, ${c.tipo}, ${c.unidad},
        ${c.css}, ${c.tasaCssEspecial}, ${c.se},
        ${c.isr}, ${c.regimenIsr}, ${c.xiii},
        ${c.vacaciones}, ${c.liquidacion}, ${c.inembargable},
        ${c.categoriaDescuento ?? null}, ${c.baseLegal}, ${c.confianza}, '1972-01-01', null
      )`);
  }

  await db.execute(sql`
    delete from regla
    where empresa_id is null
      and (codigo like 'factor\\_%' or codigo like 'divisor\\_%'
           or codigo like 'tope\\_%' or codigo like 'semanas\\_%')`);
  for (const r of REGLAS_DEVENGO) {
    await db.execute(sql`
      insert into regla (jurisdiccion_id, empresa_id, codigo, valor, vigente_desde, vigente_hasta, base_legal, confianza)
      values ('PA', null, ${r.codigo}, ${JSON.stringify({ tasa: r.valor })}::jsonb, ${r.desde}::date, null, ${r.baseLegal}, ${r.confianza})`);
  }

  await db.execute(sql`
    delete from regla
    where empresa_id is null
      and codigo in ('isr_tramos', 'isr_gastos_representacion_tramos')`);
  for (const t of TABLAS_TRAMOS) {
    await db.execute(sql`
      insert into regla (jurisdiccion_id, empresa_id, codigo, valor, vigente_desde, vigente_hasta, base_legal, confianza)
      values ('PA', null, ${t.codigo}, ${JSON.stringify(t.tramos)}::jsonb, ${t.desde}::date, null, ${t.baseLegal}, 'verificado')`);
  }

  await db.execute(sql`delete from regla where empresa_id is null and codigo = 'partidas_xiii'`);
  await db.execute(sql`
    insert into regla (jurisdiccion_id, empresa_id, codigo, valor, vigente_desde, vigente_hasta, base_legal, confianza)
    values ('PA', null, 'partidas_xiii', ${JSON.stringify(CICLO_XIII)}::jsonb, '1972-01-01'::date, null,
            'Decreto de Gabinete 221 de 1971 — tres partidas: 16-dic/15-abr, 16-abr/15-ago, 16-ago/15-dic',
            'verificado')`);

  await db.execute(sql`delete from regla where empresa_id is null and codigo = 'escala_indemnizacion'`);
  await db.execute(sql`
    insert into regla (jurisdiccion_id, empresa_id, codigo, valor, vigente_desde, vigente_hasta, base_legal, confianza)
    values ('PA', null, 'escala_indemnizacion', ${JSON.stringify(ESCALA_INDEMNIZACION)}::jsonb, '1995-08-12'::date, null,
            'Código de Trabajo Art. 225 (Ley 44 de 1995) — 3.4 semanas/año los primeros 10 años, 1 semana/año después',
            'verificado')`);

  const pendientes = CONCEPTOS.filter((c) => c.confianza !== 'verificado').length;
  console.log(
    `✓ Catálogo: ${String(CONCEPTOS.length)} conceptos (${String(pendientes)} sin verificar), ` +
      `${String(REGLAS_DEVENGO.length)} reglas de devengo, ${String(TABLAS_TRAMOS.length)} tablas de tramos`,
  );
}
