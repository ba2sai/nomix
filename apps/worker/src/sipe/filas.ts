/**
 * SIPE (CSS) — construcción de las filas del reporte mensual.
 *
 * Este módulo es PURO: recibe las líneas ya calculadas de la planilla y produce
 * las filas del archivo. No consulta la base, no escribe ficheros y no sabe en
 * qué formato binario terminará. Esa separación es deliberada: el layout de
 * columnas está verificado contra un archivo real de la cuenta piloto, pero el
 * CONTENEDOR (`.xls` BIFF8 vs `.xlsx`) no lo está, y no conviene volver a
 * derivar el mapeo el día que cambie el serializador.
 *
 * Layout verificado contra un SIPE real de julio (11 colaboradores), hoja única
 * `Empleados`, encabezado en la fila 1 y datos desde la fila 2.
 *
 * **El SIPE es MENSUAL y las planillas son quincenales.** Una fila por
 * colaborador consolida todas las planillas del mes, así que el llamador pasa
 * las líneas de las DOS quincenas juntas. Es el motivo de que esta función
 * acumule por colaborador en vez de asumir una línea por concepto: un mismo
 * `salario_ordinario` llega dos veces y tiene que sumarse, no pisarse.
 */
import type { CatalogoConceptos } from '@nomix/payroll-engine';

/**
 * Columnas del SIPE, en orden y con el nombre EXACTO del encabezado real.
 *
 * Los nombres van sin tildes y pegados porque así vienen en el archivo de la
 * CSS (`GastodeRepresentacion`, no `Gasto de Representación`). Reproducirlos
 * literalmente es parte del contrato: un encabezado "corregido" es un archivo
 * rechazado.
 *
 * El archivo real trae además una columna 26 llamada `hidden`, con valor solo
 * en la primera fila de datos. Se omite por decisión de JK (2026-08-30): es un
 * artefacto del exportador legado, no un dato que la CSS pida.
 */
export const COLUMNAS_SIPE = [
  'Tipo de Documento',
  'Numero de Documento',
  'Numero de Seguro Social',
  'Nombre',
  'Apellido',
  'Sueldo',
  'HorasExtras',
  'ImpuestoSobreRenta',
  'DecimoTercerMes',
  'Vacaciones',
  'Comisiones',
  'Bonificaciones',
  'Combustible',
  'Dieta',
  'SalarioenEspecie',
  'Viaticos',
  'GastodeRepresentacion',
  'ImpuestoSobreRentaGastoRepresentacion',
  'DecimoTercerMesGastoRepresentacion',
  'PrimasdeProduccion',
  'Dividendo',
  'ParticipacionBeneficioIngresos',
  'GratificacionAguinaldo',
  'Preaviso',
  'Indemnizacion',
] as const;

/** Las 20 casillas de monto, tras los 5 campos de identidad. */
export type CasillaSipe =
  | 'Sueldo'
  | 'HorasExtras'
  | 'ImpuestoSobreRenta'
  | 'DecimoTercerMes'
  | 'Vacaciones'
  | 'Comisiones'
  | 'Bonificaciones'
  | 'Combustible'
  | 'Dieta'
  | 'SalarioenEspecie'
  | 'Viaticos'
  | 'GastodeRepresentacion'
  | 'ImpuestoSobreRentaGastoRepresentacion'
  | 'DecimoTercerMesGastoRepresentacion'
  | 'PrimasdeProduccion'
  | 'Dividendo'
  | 'ParticipacionBeneficioIngresos'
  | 'GratificacionAguinaldo'
  | 'Preaviso'
  | 'Indemnizacion';

/**
 * A qué casilla del SIPE va cada concepto del catálogo.
 *
 * Varios conceptos caen en la MISMA casilla y se suman: la CSS da una sola
 * columna de `HorasExtras` mientras el catálogo distingue cinco tipos de hora
 * extra y dos recargos, cada uno con su factor. Confirmado por JK (2026-08-30):
 * los recargos de domingo y de día feriado van también en esa casilla.
 *
 * Un concepto que NO esté en este mapa no se reporta. Eso es correcto para las
 * retenciones de CSS y Seguro Educativo —el SIPE pide remuneración, y la cuota
 * la calcula la propia CSS— pero sería un error silencioso para un ingreso
 * nuevo, así que `construirFilasSipe` lo delata en vez de callárselo.
 */
export const CONCEPTO_A_CASILLA: Readonly<Record<string, CasillaSipe>> = {
  salario_ordinario: 'Sueldo',
  permisos_remunerados: 'Sueldo',
  licencia_enfermedad_empleador: 'Sueldo',

  extra_diurna: 'HorasExtras',
  extra_nocturna: 'HorasExtras',
  extra_prolonga_mixta_diurna: 'HorasExtras',
  extra_prolonga_nocturna: 'HorasExtras',
  extra_mixta_inicio_nocturno: 'HorasExtras',
  recargo_domingo: 'HorasExtras',
  recargo_feriado: 'HorasExtras',

  isr_retencion: 'ImpuestoSobreRenta',
  isr_retencion_gastos_representacion: 'ImpuestoSobreRentaGastoRepresentacion',

  xiii_mes: 'DecimoTercerMes',
  xiii_gastos_representacion: 'DecimoTercerMesGastoRepresentacion',

  vacaciones_pagadas: 'Vacaciones',
  comisiones: 'Comisiones',
  bonificaciones: 'Bonificaciones',
  combustible: 'Combustible',
  dieta: 'Dieta',
  salario_especie: 'SalarioenEspecie',
  viaticos: 'Viaticos',
  gastos_representacion: 'GastodeRepresentacion',
  primas: 'PrimasdeProduccion',
  dividendo: 'Dividendo',
  participacion_beneficios: 'ParticipacionBeneficioIngresos',
  gratificacion_aguinaldo: 'GratificacionAguinaldo',
  preaviso: 'Preaviso',
  indemnizacion: 'Indemnizacion',
};

/**
 * Conceptos que se omiten del SIPE a propósito, para distinguir "no aplica" de
 * "se nos olvidó mapearlo". Sin esta lista, la validación de cobertura tendría
 * que elegir entre no avisar nunca o avisar en cada planilla.
 */
const OMITIDOS_A_PROPOSITO = new Set<string>([
  // Retenciones y aportes: la CSS los calcula, no los recibe.
  'css_obrero',
  'css_obrero_tasa_especial',
  'seguro_educativo_obrero',
  'css_patronal',
  'seguro_educativo_patronal',
  'riesgos_profesionales',
  // Descuentos de acreedor: no son remuneración.
  'adelanto',
  'prestamo',
  'pension_alimenticia',
  'cuota_vivienda',
  'descuento_ausencia',
  // No cotizan y el SIPE no les da casilla.
  'gastos_reembolsables',
  'subsidio_incapacidad_css',
  'prima_antiguedad',
]);

/** Identidad del colaborador, ya descifrada por el llamador. */
export interface IdentidadColaborador {
  readonly colaboradorId: string;
  /** 'cedula' | 'pasaporte' — se traduce al vocabulario del archivo. */
  readonly tipoDocumento: string;
  readonly documento: string;
  /** `null` cuando coincide con el documento, que es el caso normal. */
  readonly seguroSocial: string | null;
  readonly nombres: string;
  readonly apellidos: string;
}

/** Una línea de `planilla_detalle`. */
export interface LineaPlanilla {
  readonly colaboradorId: string;
  readonly conceptoCodigo: string;
  /** Monto como cadena decimal, tal como sale de `numeric(18,6)`. */
  readonly monto: string;
}

/** Fila lista para serializar: identidad + las 20 casillas de monto. */
export interface FilaSipe {
  readonly tipoDocumento: string;
  readonly numeroDocumento: string;
  readonly numeroSeguroSocial: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly montos: Readonly<Record<CasillaSipe, string>>;
}

/**
 * Vocabulario del archivo para el tipo de documento. La CSS lo espera como
 * texto y sin tilde: el archivo real trae literalmente 'Cedula'.
 */
function tipoDocumentoSipe(tipo: string): string {
  switch (tipo) {
    case 'cedula':
      return 'Cedula';
    case 'pasaporte':
      return 'Pasaporte';
    default:
      throw new Error(
        `Tipo de documento '${tipo}' no tiene equivalente en el SIPE. ` +
          `La CSS solo acepta 'Cedula' y 'Pasaporte'.`,
      );
  }
}

const CASILLAS = COLUMNAS_SIPE.slice(5) as readonly CasillaSipe[];

/** Todas las casillas en cero. El SIPE real escribe ceros, no celdas vacías. */
function casillasEnCero(): Record<CasillaSipe, string> {
  const m = {} as Record<CasillaSipe, string>;
  for (const c of CASILLAS) m[c] = '0.00';
  return m;
}

/**
 * Suma dos decimales representados como cadena, sin pasar por `number`.
 *
 * El motor trabaja en decimal exacto de punta a punta (ADR-006) y convertir a
 * coma flotante aquí, en el último paso, reintroduce justo el error que todo el
 * resto del sistema evita. Un centavo de diferencia en el SIPE es una planilla
 * que la CSS rechaza.
 */
function sumarDecimal(a: string, b: string): string {
  const centavos = (s: string): bigint => {
    const limpio = s.trim();
    const neg = limpio.startsWith('-');
    const [ent, dec = ''] = limpio.replace('-', '').split('.');
    // Se trunca a 2 decimales en vez de redondear: el monto ya viene
    // redondeado del motor, y redondear dos veces mueve el centavo.
    const centesimas = (dec + '00').slice(0, 2);
    const v = BigInt(ent || '0') * 100n + BigInt(centesimas);
    return neg ? -v : v;
  };
  const total = centavos(a) + centavos(b);
  const neg = total < 0n;
  const abs = neg ? -total : total;
  return `${neg ? '-' : ''}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
}

export interface ResultadoSipe {
  readonly filas: readonly FilaSipe[];
  /**
   * Conceptos presentes en la planilla que nadie supo dónde poner. No se lanza
   * excepción: un concepto nuevo sin mapear no debe impedir declarar a la CSS,
   * pero tampoco puede desaparecer en silencio de un reporte oficial. El
   * llamador decide si bloquea o avisa.
   */
  readonly conceptosSinMapear: readonly string[];
}

/**
 * Construye las filas del SIPE a partir de las líneas de la planilla.
 *
 * El orden de las filas sigue el de `identidades`: el llamador decide si es por
 * código de empleado o alfabético, y así el archivo sale reproducible.
 */
export function construirFilasSipe(
  identidades: readonly IdentidadColaborador[],
  lineas: readonly LineaPlanilla[],
  catalogo: CatalogoConceptos,
): ResultadoSipe {
  const porColaborador = new Map<string, Record<CasillaSipe, string>>();
  for (const ident of identidades) {
    porColaborador.set(ident.colaboradorId, casillasEnCero());
  }

  const sinMapear = new Set<string>();

  for (const linea of lineas) {
    const casillas = porColaborador.get(linea.colaboradorId);
    if (!casillas) {
      throw new Error(
        `La planilla tiene líneas del colaborador ${linea.colaboradorId} ` +
          `pero no se pasó su identidad. El SIPE no puede declarar un pago sin titular.`,
      );
    }

    // Falla ruidosamente ante un concepto fuera del catálogo vigente: es la
    // misma garantía que da el motor, y aquí importa igual.
    catalogo.get(linea.conceptoCodigo);

    const casilla = CONCEPTO_A_CASILLA[linea.conceptoCodigo];
    if (!casilla) {
      if (!OMITIDOS_A_PROPOSITO.has(linea.conceptoCodigo)) {
        sinMapear.add(linea.conceptoCodigo);
      }
      continue;
    }

    casillas[casilla] = sumarDecimal(casillas[casilla], linea.monto);
  }

  const filas = identidades.map((ident): FilaSipe => {
    const montos = porColaborador.get(ident.colaboradorId);
    if (!montos) throw new Error(`Falta el acumulador de ${ident.colaboradorId}`);
    return {
      tipoDocumento: tipoDocumentoSipe(ident.tipoDocumento),
      numeroDocumento: ident.documento,
      // Confirmado por JK (2026-08-30): hoy coinciden, pero en fichas antiguas
      // podían diferir. `null` significa "el mismo", no "desconocido".
      numeroSeguroSocial: ident.seguroSocial ?? ident.documento,
      nombre: ident.nombres,
      apellido: ident.apellidos,
      montos,
    };
  });

  return { filas, conceptosSinMapear: [...sinMapear].sort() };
}
