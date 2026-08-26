/**
 * Esquema de datos de Nomix (Drizzle + PostgreSQL 16).
 *
 * Convenciones no negociables:
 *  - Todo monto es `numeric(18,6)` y Drizzle lo devuelve como STRING (ADR-006).
 *    `mode: 'number'` está PROHIBIDO en columnas monetarias: reintroduce el
 *    punto flotante que Money existe para evitar.
 *  - Toda tabla con datos de empresa lleva `empresa_id` y una política RLS
 *    (ADR-011). Ver migración 0002_rls.sql.
 *
 * Esto es el arranque del modelo (identidad, tenencia y reglas). Las entidades
 * de planilla, colaborador y liquidación se agregan en iteraciones siguientes.
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  date,
  timestamp,
  numeric,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';

/** Monto monetario: numeric(18,6) devuelto como string (ADR-006). */
const money = (name: string) => numeric(name, { precision: 18, scale: 6 });

// --- Identidad y tenencia (ADR-011) ---

export const usuario = pgTable('usuario', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(), // columna citext en la migración
  passwordHash: text('password_hash').notNull(),
  nombre: text('nombre').notNull(),
  activo: boolean('activo').notNull().default(true),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
});

export const empresa = pgTable('empresa', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombreComercial: text('nombre_comercial').notNull(),
  razonSocial: text('razon_social').notNull(),
  ruc: text('ruc'),
  dv: text('dv'),
  numeroPatronal: text('numero_patronal'),
  actividadCiiu: text('actividad_ciiu'), // salario mínimo + tarifa RP
  regionSalarioMinimo: text('region_salario_minimo'), // '1' | '2'
  tamanoEmpresa: text('tamano_empresa'),
  cantidadTrabajadores: text('cantidad_trabajadores'),
  tasaRiesgoProfesional: numeric('tasa_riesgo_profesional', { precision: 6, scale: 4 }),
  pagaAguinaldoAcostumbrado: boolean('paga_aguinaldo_acostumbrado').notNull().default(false),
  jurisdiccionId: text('jurisdiccion_id').notNull().default('PA'),
});

/** Membresía usuario↔empresa con vigencia (modelo de firma contable). */
export const usuarioEmpresa = pgTable(
  'usuario_empresa',
  {
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id),
    rol: text('rol').notNull(),
    vigenteDesde: date('vigente_desde').notNull(),
    vigenteHasta: date('vigente_hasta'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.usuarioId, t.empresaId, t.vigenteDesde] }),
  }),
);

// --- Reglas temporales (ADR-001) ---

export const regla = pgTable('regla', {
  id: uuid('id').primaryKey().defaultRandom(),
  jurisdiccionId: text('jurisdiccion_id').notNull().default('PA'),
  empresaId: uuid('empresa_id').references(() => empresa.id), // null = regla general
  codigo: text('codigo').notNull(),
  valor: jsonb('valor').notNull(),
  vigenteDesde: date('vigente_desde').notNull(),
  vigenteHasta: date('vigente_hasta'),
  conocidoDesde: timestamp('conocido_desde', { withTimezone: true }).notNull().defaultNow(),
  baseLegal: text('base_legal').notNull(),
  confianza: text('confianza').notNull(), // verificado | verificar | pendiente
});

/** Catálogo de conceptos con matriz de incidencia (ADR-002). */
export const concepto = pgTable('concepto', {
  id: uuid('id').primaryKey().defaultRandom(),
  jurisdiccionId: text('jurisdiccion_id').notNull().default('PA'),
  empresaId: uuid('empresa_id').references(() => empresa.id),
  codigo: text('codigo').notNull(),
  nombre: text('nombre').notNull(),
  tipo: text('tipo').notNull(), // ingreso | deduccion | aporte_patronal | provision
  incideCss: boolean('incide_css').notNull(),
  tasaCssEspecial: numeric('tasa_css_especial', { precision: 8, scale: 6 }),
  incideSeguroEducativo: boolean('incide_seguro_educativo').notNull(),
  incideIsr: boolean('incide_isr').notNull(),
  regimenIsr: text('regimen_isr').notNull(), // ordinario | gastos_representacion | exento
  incideBaseXiii: boolean('incide_base_xiii').notNull(),
  incidePromedioVacaciones: boolean('incide_promedio_vacaciones').notNull(),
  incideBaseLiquidacion: boolean('incide_base_liquidacion').notNull(),
  esInembargable: boolean('es_inembargable').notNull(),
  vigenteDesde: date('vigente_desde').notNull(),
  vigenteHasta: date('vigente_hasta'),
});

/** Cola de eventos de dominio (patrón outbox, ADR-013 — enganche futuro de n8n). */
export const eventoSaliente = pgTable('evento_saliente', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id').notNull(),
  tipo: text('tipo').notNull(), // PlanillaAprobada | ContratoPorVencer | ...
  payload: jsonb('payload').notNull(),
  ocurridoEn: timestamp('ocurrido_en', { withTimezone: true }).notNull().defaultNow(),
  publicadoEn: timestamp('publicado_en', { withTimezone: true }),
});

// Nota: `money(...)` se usará en planilla_detalle / planilla_traza al modelar
// esas tablas. Se declara aquí para fijar la convención numeric(18,6)→string.
void money;
