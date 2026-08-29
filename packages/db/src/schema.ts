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
  unique,
  uniqueIndex,
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
  /**
   * Convención de prorrateo del salario base en planillas de período parcial
   * (doc 05 §2, consulta 📋 abierta). `mitad_mensual` = salario ÷ 2 por quincena
   * sin importar los días del tramo, que es lo que reproduce el asiento real de
   * jun-2026. `dias_reales` = salario diario × días del tramo.
   */
  metodoProrrateo: text('metodo_prorrateo').notNull().default('mitad_mensual'),
  /** Divisor de la hora ordinaria: 208 (48h/sem) o 192 (base legal §12.2). */
  horasMensuales: text('horas_mensuales').notNull().default('208'),
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

/**
 * Catálogo de conceptos con matriz de incidencia (ADR-002).
 *
 * Un concepto de nómina es una FILA DE DATOS, no una clase de código. Cada uno
 * declara en qué bases entra, y el motor lo consulta en vez de codificarlo. La
 * tentación de escribir `if (concepto === 'xiii_mes')` se rechaza siempre.
 *
 * `empresa_id` nullable es lo que habilita convenios colectivos y regímenes
 * especiales (CAPAC-SUNTRACS) sin tocar código: son filas que sobrescriben la
 * regla general del país.
 */
export const concepto = pgTable(
  'concepto',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jurisdiccionId: text('jurisdiccion_id').notNull().default('PA'),
    empresaId: uuid('empresa_id').references(() => empresa.id),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    tipo: text('tipo').notNull(), // ingreso | deduccion | aporte_patronal | provision
    /** monto | horas | dias — decide si el movimiento trae importe o cantidad. */
    unidad: text('unidad').notNull().default('monto'),
    incideCss: boolean('incide_css').notNull(),
    tasaCssEspecial: numeric('tasa_css_especial', { precision: 8, scale: 6 }),
    incideSeguroEducativo: boolean('incide_seguro_educativo').notNull(),
    incideIsr: boolean('incide_isr').notNull(),
    regimenIsr: text('regimen_isr').notNull(), // ordinario | gastos_representacion | exento
    incideBaseXiii: boolean('incide_base_xiii').notNull(),
    incidePromedioVacaciones: boolean('incide_promedio_vacaciones').notNull(),
    incideBaseLiquidacion: boolean('incide_base_liquidacion').notNull(),
    esInembargable: boolean('es_inembargable').notNull(),
    /**
     * Régimen del descuento frente a los topes del Art. 161 (ADR-004):
     * `pension_alimenticia` (exenta del tope global) | `vivienda` (tope propio
     * del 30%) | `ordinario` (sujeto al 50%). NULL en todo lo que no es un
     * descuento de acreedor — incluidas las retenciones de ley, que no compiten
     * por la capacidad del 50%.
     */
    categoriaDescuento: text('categoria_descuento'),
    /** Artículo/ley que sustenta la incidencia. Alimenta la traza (ADR-005). */
    baseLegal: text('base_legal').notNull(),
    /** verificado | verificar | pendiente — mismo vocabulario que `regla`. */
    confianza: text('confianza').notNull(),
    vigenteDesde: date('vigente_desde').notNull(),
    vigenteHasta: date('vigente_hasta'),
  },
  (t) => ({
    // NULLS NOT DISTINCT: sin esto, Postgres trataría cada fila general
    // (empresa_id NULL) como única y permitiría duplicados del mismo concepto.
    uxConcepto: unique('ux_concepto_vigencia')
      .on(t.jurisdiccionId, t.empresaId, t.codigo, t.vigenteDesde)
      .nullsNotDistinct(),
  }),
);

/**
 * Colaborador (ENT-001). Entidad central de RRHH. Primer subconjunto de campos;
 * los ~40 restantes se agregan por pasos del wizard sin rediseñar.
 *
 * PII (ADR-007): la identificación se guarda CIFRADA (`id_cifrado`, AES-256-GCM)
 * más un índice ciego (`id_bidx`, HMAC) para unicidad y búsqueda sin descifrar.
 * `salario_mensual` NO se cifra (rompería reportes agregados); se protege con
 * RLS + permisos + auditoría.
 */
export const colaborador = pgTable(
  'colaborador',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id),
    codEmpleado: text('cod_empleado').notNull(),
    nombres: text('nombres').notNull(),
    apellidos: text('apellidos').notNull(),
    tipoDocumento: text('tipo_documento').notNull(), // cedula | pasaporte
    idCifrado: text('id_cifrado').notNull(), // identificación cifrada (AES-256-GCM)
    idBidx: text('id_bidx').notNull(), // índice ciego (HMAC) para unicidad/búsqueda
    // Paso 1 — Datos personales
    sexo: text('sexo'),
    fechaNacimiento: date('fecha_nacimiento'),
    estadoCivil: text('estado_civil'),
    telefono: text('telefono'),
    correo: text('correo'),
    // Paso 2 — Contrato y cargo
    cargo: text('cargo'),
    tipoContrato: text('tipo_contrato').notNull(), // indefinido | definido | obra | servicios
    tipoPlanilla: text('tipo_planilla').notNull(),
    fechaIngreso: date('fecha_ingreso').notNull(),
    fechaTermino: date('fecha_termino'),
    pProbatorio: boolean('p_probatorio').notNull().default(false),
    esTecnico: boolean('es_tecnico').notNull().default(false), // preaviso 2 meses (Art. 222)
    // Paso 3 — Salario y banco (cuenta CIFRADA, ADR-007)
    salarioMensual: numeric('salario_mensual', { precision: 18, scale: 6 }).notNull(),
    formaPago: text('forma_pago'), // cheque | ach | efectivo
    idBanco: text('id_banco'),
    tipoCuenta: text('tipo_cuenta'), // ahorro | corriente
    cuentaCifrada: text('cuenta_cifrada'),
    // Paso 5 — Retenciones
    declaraRenta: boolean('declara_renta').notNull().default(false),
    gastoRep: numeric('gasto_rep', { precision: 18, scale: 6 }),
    /**
     * Aguinaldo o bonificación de Navidad pactada o acostumbrada de manera
     * reiterada (Decreto 19 de 1973 Art. 3º). Compite con la 3ª partida del
     * XIII y se paga la suma más favorable al trabajador. Solo se lee cuando
     * `empresa.paga_aguinaldo_acostumbrado` está encendido: las dos columnas
     * son la misma regla, una por el lado de la empresa y otra por el del
     * colaborador. `null` = este colaborador no tiene aguinaldo pactado.
     */
    montoAguinaldo: numeric('monto_aguinaldo', { precision: 18, scale: 6 }),
    status: text('status').notNull().default('activo'), // activo | vacaciones | licencia | suspendido | cesante
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uxCod: uniqueIndex('ux_colaborador_empresa_cod').on(t.empresaId, t.codEmpleado),
    uxId: uniqueIndex('ux_colaborador_empresa_idbidx').on(t.empresaId, t.idBidx),
  }),
);

/**
 * Planilla — cabecera con su máquina de estados (Factor WOW #1, "Zero-Recalculate").
 * Estados: borrador → calculada → aprobada → cerrada. Se puede recalcular mientras
 * no esté aprobada. Al cerrar queda inmutable y emite un evento (ADR-013).
 */
export const planillaCabecera = pgTable('planilla_cabecera', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresa.id),
  tipo: text('tipo').notNull(), // quincenal | bisemanal | ...
  periodoDesde: date('periodo_desde').notNull(),
  periodoHasta: date('periodo_hasta').notNull(),
  fechaPago: date('fecha_pago'),
  estado: text('estado').notNull().default('borrador'),
  totales: jsonb('totales'),
  calculadaEn: timestamp('calculada_en', { withTimezone: true }),
  aprobadaEn: timestamp('aprobada_en', { withTimezone: true }),
  aprobadaPor: uuid('aprobada_por'),
  cerradaEn: timestamp('cerrada_en', { withTimezone: true }),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Devengado variable del período: horas extra, vacaciones, comisiones, ausencias,
 * descuentos. Se ancla a la PLANILLA, no al calendario, para que el recálculo de
 * `ProcesoService.calcular` siga siendo determinista (Zero-Recalculate).
 *
 * `cantidad` se usa cuando el concepto tiene unidad `horas`/`dias` (el motor la
 * convierte a monto con el salario/hora y el factor de recargo vigentes);
 * `monto` cuando el concepto es de unidad `monto` y trae el importe ya definido.
 */
export const movimiento = pgTable('movimiento', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id').notNull(), // para RLS directo
  planillaId: uuid('planilla_id')
    .notNull()
    .references(() => planillaCabecera.id, { onDelete: 'cascade' }),
  colaboradorId: uuid('colaborador_id')
    .notNull()
    .references(() => colaborador.id),
  conceptoCodigo: text('concepto_codigo').notNull(),
  cantidad: money('cantidad'),
  monto: money('monto'),
  nota: text('nota'),
  origen: text('origen').notNull().default('manual'), // manual | biometrico | importado
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  creadoPor: uuid('creado_por'),
});

/**
 * Conceptos FIJOS del colaborador (`ADR-021`).
 *
 * Lo que se repite período tras período sin que nadie lo vuelva a teclear:
 * gastos de representación, dietas, un descuento directo pactado. Hasta ahora
 * la ficha solo tenía la columna `gasto_rep`, que además **no se usaba en el
 * cálculo**: el dato estaba capturado y la planilla lo ignoraba.
 *
 * Es una tabla y no más columnas en `colaborador` por la misma razón que el
 * catálogo de conceptos es dato y no código (`ADR-002`): asignar un concepto
 * nuevo a alguien debe ser un INSERT, no una migración. Y lleva vigencia
 * propia porque estas asignaciones caducan —un descuento se termina de pagar,
 * una dieta se aprueba solo por un semestre— y la planilla de marzo no puede
 * recalcularse con lo que se pactó en agosto (`ADR-001`).
 */
export const colaboradorConcepto = pgTable('colaborador_concepto', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id').notNull(), // para RLS directo
  colaboradorId: uuid('colaborador_id')
    .notNull()
    .references(() => colaborador.id, { onDelete: 'cascade' }),
  conceptoCodigo: text('concepto_codigo').notNull(),
  /** Se usa uno u otro según la `unidad` del concepto, igual que `movimiento`. */
  monto: money('monto'),
  cantidad: money('cantidad'),
  vigenteDesde: date('vigente_desde').notNull(),
  /** null = sin fecha de fin. */
  vigenteHasta: date('vigente_hasta'),
  nota: text('nota'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  creadoPor: uuid('creado_por'),
});

/**
 * Documentos del colaborador: contratos, cédula, certificaciones (`ADR-022`).
 *
 * La fila describe el archivo; el archivo vive en disco. No se guarda el
 * contenido en `bytea` porque un contrato escaneado de varios MB por cada
 * colaborador infla la base y, con ella, cada respaldo y cada restauración
 * PITR (`ADR-012`) — justo la operación que uno quiere rápida y predecible.
 *
 * `almacen_id` es un UUID, NO el nombre que subió el usuario. El nombre
 * original se guarda aparte, solo para mostrarlo y para la descarga: usarlo
 * como ruta invita a `../../etc/passwd` y a colisiones entre dos "contrato.pdf".
 */
export const documentoColaborador = pgTable('documento_colaborador', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id').notNull(), // para RLS directo
  colaboradorId: uuid('colaborador_id')
    .notNull()
    .references(() => colaborador.id, { onDelete: 'cascade' }),
  /** contrato | cedula | certificacion | otro */
  tipo: text('tipo').notNull(),
  /** Nombre con el que el usuario lo subió. Se muestra; nunca se usa como ruta. */
  nombre: text('nombre').notNull(),
  mime: text('mime').notNull(),
  tamano: text('tamano').notNull(), // bytes, como texto para no perder precisión
  /** SHA-256 del contenido: detecta corrupción y duplicados exactos. */
  hash: text('hash').notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  creadoPor: uuid('creado_por'),
});

/** Líneas de la planilla: un concepto por colaborador. */
export const planillaDetalle = pgTable('planilla_detalle', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id').notNull(), // para RLS directo
  planillaId: uuid('planilla_id')
    .notNull()
    .references(() => planillaCabecera.id, { onDelete: 'cascade' }),
  colaboradorId: uuid('colaborador_id')
    .notNull()
    .references(() => colaborador.id),
  conceptoCodigo: text('concepto_codigo').notNull(),
  tipo: text('tipo').notNull(), // ingreso | deduccion | aporte_patronal
  cantidad: numeric('cantidad', { precision: 18, scale: 6 }),
  base: numeric('base', { precision: 18, scale: 6 }),
  monto: numeric('monto', { precision: 18, scale: 6 }).notNull(),
});

/** Trazabilidad: qué regla produjo cada línea calculada (ADR-005). */
export const planillaTraza = pgTable('planilla_traza', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id').notNull(), // para RLS directo
  detalleId: uuid('detalle_id')
    .notNull()
    .references(() => planillaDetalle.id, { onDelete: 'cascade' }),
  reglaCodigo: text('regla_codigo').notNull(),
  baseAplicada: numeric('base_aplicada', { precision: 18, scale: 6 }),
  tasaAplicada: text('tasa_aplicada'),
  resultado: numeric('resultado', { precision: 18, scale: 6 }),
  articuloLegal: text('articulo_legal'),
  calculadoEn: timestamp('calculado_en', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Bitácora de acceso a datos sensibles (`ADR-019`).
 *
 * Es la contrapartida exigida por `ADR-007`: `salario_base` NO se cifra a nivel
 * de aplicación porque romper la agregación costaría más de lo que protege, y
 * `ARCHITECTURE.md` §5.3 fija el precio de esa decisión — "la auditoría de
 * acceso a salarios debe estar operativa antes del primer dato real".
 *
 * Append-only por construcción, no por convención: la tabla tiene política de
 * INSERT y de SELECT, y NINGUNA de UPDATE ni DELETE. Bajo RLS, una operación
 * sin política se deniega, así que ni siquiera el rol de la aplicación puede
 * reescribir su propio rastro. Ver `rls.sql`.
 *
 * Se registran tanto los accesos permitidos como los DENEGADOS: un 403 contra
 * datos de salario es más interesante para un investigador que un 200.
 */
export const accesoAuditoria = pgTable('acceso_auditoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id').notNull(),
  usuarioId: uuid('usuario_id').notNull(),
  /** Rol vigente al momento del acceso. Se copia: la membresía puede cambiar. */
  rol: text('rol').notNull(),
  ocurridoEn: timestamp('ocurrido_en', { withTimezone: true }).notNull().defaultNow(),
  /** Permiso declarado por la ruta (`colaborador:leer`), no la URL. */
  accion: text('accion').notNull(),
  metodo: text('metodo').notNull(),
  ruta: text('ruta').notNull(),
  /** Id del recurso concreto cuando la ruta lo lleva; null en los listados. */
  recursoId: text('recurso_id'),
  resultado: text('resultado').notNull(), // permitido | denegado
  /** Motivo cuando `resultado = denegado`: qué permiso faltó, o membresía vencida. */
  motivo: text('motivo'),
  ip: text('ip'),
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

