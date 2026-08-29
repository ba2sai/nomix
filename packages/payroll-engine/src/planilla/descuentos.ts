import { Money, Rate } from '../money.js';

/**
 * Asignación de descuentos con restricciones (ADR-004, base legal §9).
 *
 * El Art. 161 del Código de Trabajo no describe una resta: describe un problema
 * de asignación con topes que interactúan. Recorrer los descuentos en un bucle
 * y restarlos produce resultados ILEGALES — de ahí que esto sea una etapa
 * dedicada y no un `for` dentro del cálculo.
 *
 * Las cuatro restricciones y cómo se modelan aquí:
 *
 *  1. **Tope global del 50%** del salario en dinero — consume capacidad.
 *  2. **Tope del 30%** para compra de vivienda — tope PROPIO, además del global.
 *  3. **Pensión alimenticia EXENTA** del tope global (Art. 161) — se asigna
 *     completa antes que nada y no consume capacidad de los demás.
 *  4. **Inembargabilidad en cuantía completa** de vacaciones, jubilaciones,
 *     pensiones e indemnizaciones: sobre esa porción del pago NO se asigna
 *     ningún descuento de acreedor. No es un tope, es una exclusión.
 *
 * Ninguna de esas cifras vive aquí: llegan como `Rate` resueltos por la fecha
 * del período desde la configuración de reglas (ADR-001).
 *
 * Cada descuento sale con su `razon`: por qué se aplicó completo, parcial o
 * nada. Un descuento recortado en silencio es un reclamo del acreedor que nadie
 * puede explicar tres meses después.
 */

/**
 * Régimen del descuento frente a los topes del Art. 161. Es un DATO del
 * concepto (`concepto.categoria_descuento`), no una inferencia por código:
 * añadir "cuota sindical" o "cooperativa" es un INSERT, no un `if` nuevo.
 */
export type CategoriaDescuento = 'pension_alimenticia' | 'vivienda' | 'ordinario';

/** Por qué un descuento quedó como quedó. Sube a la UI y a la traza (ADR-005). */
export type RazonAsignacion =
  | 'completo'
  | 'parcial_tope_global'
  | 'parcial_tope_vivienda'
  | 'sin_capacidad'
  | 'excluido_inembargable'
  | 'parcial_salario_minimo';

export interface DescuentoSolicitado {
  readonly conceptoCodigo: string;
  readonly categoria: CategoriaDescuento;
  readonly montoSolicitado: Money;
  /**
   * Antigüedad de la orden, como marca de tiempo ISO 8601 ordenable
   * lexicográficamente ('2026-01-15' o '2026-01-15T14:32:00.000Z'). Es el
   * criterio de prelación entre acreedores ordinarios mientras la consulta
   * **E1** siga sin responder: el Art. 161 no fija ninguno. Documentado como
   * decisión de producto, no como regla legal (ADR-004).
   *
   * La precisión importa: con solo la fecha, dos órdenes del mismo día
   * desempatan por código alfabético, que es arbitrario y decide quién cobra
   * cuando el 50% no alcanza para ambos.
   */
  readonly desde: string;
}

export interface DescuentoAsignado {
  readonly conceptoCodigo: string;
  readonly categoria: CategoriaDescuento;
  readonly montoSolicitado: Money;
  readonly montoAplicado: Money;
  /** Lo que no se pudo descontar. Se arrastra al período siguiente (consulta E5). */
  readonly saldoArrastrado: Money;
  readonly razon: RazonAsignacion;
}

export interface TopesDescuento {
  /** Tope global — regla `tope_descuento_global` ("0.50", Art. 161). */
  readonly global: Rate;
  /** Tope de vivienda — regla `tope_descuento_vivienda` ("0.30", Art. 161). */
  readonly vivienda: Rate;
}

export interface InsumoAsignacion {
  /**
   * Salario en dinero del período: la base sobre la que se miden los topes.
   *
   * ⚠️ **Consulta E2 abierta.** El Art. 161 dice "el total de deducciones y
   * retenciones no excederá del 50% del salario en dinero", pero la §9.1 de la
   * base legal lista ISR y cuota obrera de CSS como "sin límite (retención de
   * ley)". Las dos lecturas no pueden ser ciertas a la vez. Nomix toma la
   * segunda: las retenciones de ley **no consumen** el tope del 50%, y el tope
   * se mide sobre el devengado en dinero. El llamador decide qué monto pasa
   * aquí; el motor no lo deriva por su cuenta.
   */
  readonly salarioEnDinero: Money;
  /**
   * Porción del pago que es inembargable en cuantía completa (vacaciones,
   * indemnizaciones, jubilaciones — Art. 161). Se descuenta de la base ANTES de
   * medir los topes: sobre ella no se asigna ningún descuento de acreedor.
   */
  readonly montoInembargable: Money;
  /**
   * Piso de salario mínimo aplicable a la región y actividad del colaborador
   * (Art. 161: el salario es inembargable hasta el mínimo legal). `null`
   * mientras la tabla de 59 tasas del D.E. 13 de 2025 no esté cargada — en ese
   * caso el piso NO se verifica y el resultado lo declara.
   */
  readonly pisoSalarioMinimo: Money | null;
  readonly topes: TopesDescuento;
  readonly solicitados: readonly DescuentoSolicitado[];
}

export interface ResultadoAsignacion {
  readonly asignados: readonly DescuentoAsignado[];
  /** Base sobre la que se midieron los topes (`salarioEnDinero − inembargable`). */
  readonly baseEmbargable: Money;
  /** Capacidad total del tope global sobre esa base. */
  readonly capacidadGlobal: Money;
  /** Suma efectivamente asignada (incluye la pensión alimenticia exenta). */
  readonly totalAplicado: Money;
  /** Suma que no cupo y se arrastra. */
  readonly totalArrastrado: Money;
  /**
   * Hallazgos que el usuario tiene que ver: piso de salario mínimo sin
   * verificar, descuentos recortados, exclusiones por inembargabilidad.
   */
  readonly advertencias: readonly string[];
}

/** Ordena por antigüedad de la orden; a igual fecha, por código (determinista). */
function porPrelacion(a: DescuentoSolicitado, b: DescuentoSolicitado): number {
  if (a.desde !== b.desde) return a.desde < b.desde ? -1 : 1;
  return a.conceptoCodigo < b.conceptoCodigo ? -1 : 1;
}

function asignado(
  d: DescuentoSolicitado,
  montoAplicado: Money,
  razon: RazonAsignacion,
): DescuentoAsignado {
  return {
    conceptoCodigo: d.conceptoCodigo,
    categoria: d.categoria,
    montoSolicitado: d.montoSolicitado,
    montoAplicado,
    saldoArrastrado: d.montoSolicitado.minus(montoAplicado),
    razon,
  };
}

/** El menor de dos montos. `Money.max` ya existe; su espejo vivía inline. */
function menor(a: Money, b: Money): Money {
  return a.greaterThan(b) ? b : a;
}

/**
 * Asigna los descuentos del período respetando los topes del Art. 161.
 *
 * Orden de asignación (base legal §9.4, `ADR-004`):
 *
 *   1. Pensión alimenticia — completa, EXENTA del tope global.
 *   2. Vivienda — hasta su tope propio del 30%, consumiendo capacidad global.
 *   3. Ordinarios — por prelación, hasta agotar la capacidad global.
 *
 * Sobre un pago íntegramente inembargable (una liquidación, un pago de
 * vacaciones puro) la base embargable es cero y **ningún** descuento de
 * acreedor se asigna — ni siquiera uno que el trabajador autorizó, porque la
 * inembargabilidad del Art. 161 no es renunciable (consulta E4.a).
 */
export function asignarDescuentos(insumo: InsumoAsignacion): ResultadoAsignacion {
  const baseEmbargable = insumo.salarioEnDinero.minus(insumo.montoInembargable);
  const embargable = baseEmbargable.isNegative() ? Money.ZERO : baseEmbargable;
  const capacidadGlobal = embargable.times(insumo.topes.global);
  const capacidadVivienda = embargable.times(insumo.topes.vivienda);

  const asignados: DescuentoAsignado[] = [];
  const advertencias: string[] = [];
  let capacidadRestante = capacidadGlobal;
  let totalAplicado = Money.ZERO;

  const ordenados = [...insumo.solicitados].sort(porPrelacion);
  const pensiones = ordenados.filter((d) => d.categoria === 'pension_alimenticia');
  const viviendas = ordenados.filter((d) => d.categoria === 'vivienda');
  const ordinarios = ordenados.filter((d) => d.categoria === 'ordinario');

  // 1. Pensión alimenticia — exenta del tope global (Art. 161). No consume
  //    capacidad, así que se asigna completa aunque deje el neto en cero: la
  //    consulta E3.b sobre si puede llegar a cero sigue abierta y Nomix no
  //    inventa un tope que la ley no da.
  for (const d of pensiones) {
    asignados.push(asignado(d, d.montoSolicitado, 'completo'));
    totalAplicado = totalAplicado.plus(d.montoSolicitado);
  }

  // 2. Vivienda — tope propio del 30%, y además dentro del global.
  let usadoVivienda = Money.ZERO;
  for (const d of viviendas) {
    if (embargable.isZero()) {
      asignados.push(asignado(d, Money.ZERO, 'excluido_inembargable'));
      continue;
    }
    const margenVivienda = capacidadVivienda.minus(usadoVivienda);
    const limite = menor(margenVivienda, capacidadRestante);
    const aplicado = menor(d.montoSolicitado, limite.isNegative() ? Money.ZERO : limite);
    // `aplicado` nunca excede lo solicitado (es un `menor`), así que basta con
    // preguntar si quedó corto — y cuál de los dos topes lo recortó.
    const quedoCorto = d.montoSolicitado.greaterThan(aplicado);
    const razon: RazonAsignacion = aplicado.isZero()
      ? 'sin_capacidad'
      : !quedoCorto
        ? 'completo'
        : margenVivienda.greaterThan(capacidadRestante)
          ? 'parcial_tope_global'
          : 'parcial_tope_vivienda';
    asignados.push(asignado(d, aplicado, razon));
    usadoVivienda = usadoVivienda.plus(aplicado);
    capacidadRestante = capacidadRestante.minus(aplicado);
    totalAplicado = totalAplicado.plus(aplicado);
  }

  // 3. Ordinarios — por prelación (antigüedad de la orden), hasta agotar el 50%.
  for (const d of ordinarios) {
    if (embargable.isZero()) {
      asignados.push(asignado(d, Money.ZERO, 'excluido_inembargable'));
      continue;
    }
    const disponible = capacidadRestante.isNegative() ? Money.ZERO : capacidadRestante;
    const aplicado = menor(d.montoSolicitado, disponible);
    const razon: RazonAsignacion = aplicado.isZero()
      ? 'sin_capacidad'
      : d.montoSolicitado.greaterThan(aplicado)
        ? 'parcial_tope_global'
        : 'completo';
    asignados.push(asignado(d, aplicado, razon));
    capacidadRestante = capacidadRestante.minus(aplicado);
    totalAplicado = totalAplicado.plus(aplicado);
  }

  const totalArrastrado = asignados.reduce((acc, a) => acc.plus(a.saldoArrastrado), Money.ZERO);

  if (!insumo.montoInembargable.isZero()) {
    advertencias.push(
      `B/. ${insumo.montoInembargable.toFixed2()} del pago son inembargables en cuantía completa ` +
        `(Art. 161: vacaciones, jubilaciones, pensiones e indemnizaciones). Sobre esa porción no ` +
        `se asignó ningún descuento de acreedor.`,
    );
  }
  if (!totalArrastrado.isZero()) {
    advertencias.push(
      `B/. ${totalArrastrado.toFixed2()} no cupieron en los topes del Art. 161 y quedan como saldo ` +
        `arrastrado. Nomix no lo aplica automáticamente al período siguiente: la consulta E5 ` +
        `(si el saldo se arrastra, si genera mora y si hay que notificar al acreedor) sigue abierta.`,
    );
  }
  if (insumo.pisoSalarioMinimo === null) {
    advertencias.push(
      'No se verificó el piso de salario mínimo (Art. 161: el salario es inembargable hasta el ' +
        'mínimo legal). La tabla de 59 tasas del D.E. 13 de 2025 no está cargada todavía.',
    );
  } else {
    const netoTrasDescuentos = insumo.salarioEnDinero.minus(totalAplicado);
    if (insumo.pisoSalarioMinimo.greaterThan(netoTrasDescuentos)) {
      advertencias.push(
        `El neto tras descuentos (B/. ${netoTrasDescuentos.toFixed2()}) queda por debajo del ` +
          `salario mínimo aplicable (B/. ${insumo.pisoSalarioMinimo.toFixed2()}). El Art. 161 ` +
          `declara el salario inembargable hasta ese importe: revisa la asignación antes de aprobar.`,
      );
    }
  }

  return {
    asignados,
    baseEmbargable: embargable,
    capacidadGlobal,
    totalAplicado,
    totalArrastrado,
    advertencias,
  };
}
