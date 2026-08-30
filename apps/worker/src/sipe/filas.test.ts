/**
 * Casos de aceptación del SIPE.
 *
 * Los perfiles vienen de un SIPE real de julio de la cuenta piloto, pero los
 * nombres y documentos están INVENTADOS: lo que se conserva son los montos y
 * la forma de cada caso, que es lo que ejercita el mapeo. Los datos de las
 * personas reales no entran al repositorio (Ley 81, y `ARCHITECTURE.md` §8:
 * datos reales solo en producción).
 */
import { describe, it, expect } from 'vitest';
import { CatalogoConceptos, type Concepto } from '@nomix/payroll-engine';
import {
  construirFilasSipe,
  COLUMNAS_SIPE,
  CONCEPTO_A_CASILLA,
  type IdentidadColaborador,
  type LineaPlanilla,
} from './filas.js';

function concepto(codigo: string, parcial: Partial<Concepto> = {}): Concepto {
  return {
    codigo,
    nombre: codigo,
    tipo: 'ingreso',
    unidad: 'monto',
    incideCss: false,
    tasaCssEspecial: null,
    incideSeguroEducativo: false,
    incideIsr: false,
    regimenIsr: 'ordinario',
    incideBaseXiii: false,
    incidePromedioVacaciones: false,
    incideBaseLiquidacion: false,
    esInembargable: false,
    categoriaDescuento: null,
    baseLegal: 'test',
    confianza: 'verificado',
    ...parcial,
  };
}

/** Catálogo con todo lo que el mapeo puede encontrarse. */
const catalogo = new CatalogoConceptos([
  ...Object.keys(CONCEPTO_A_CASILLA).map((c) => concepto(c)),
  concepto('css_obrero', { tipo: 'deduccion' }),
  concepto('seguro_educativo_obrero', { tipo: 'deduccion' }),
  concepto('css_patronal', { tipo: 'aporte_patronal' }),
  concepto('prestamo', { tipo: 'deduccion' }),
  concepto('prima_antiguedad'),
  concepto('concepto_nuevo_sin_mapear'),
]);

const ident = (
  id: string,
  parcial: Partial<IdentidadColaborador> = {},
): IdentidadColaborador => ({
  colaboradorId: id,
  tipoDocumento: 'cedula',
  documento: '8-111-2222',
  seguroSocial: null,
  nombres: 'NOMBRE PRUEBA',
  apellidos: 'APELLIDO PRUEBA',
  ...parcial,
});

const linea = (colaboradorId: string, conceptoCodigo: string, monto: string): LineaPlanilla => ({
  colaboradorId,
  conceptoCodigo,
  monto,
});

describe('layout del archivo', () => {
  it('tiene 25 columnas: la columna `hidden` del legado no se reproduce', () => {
    expect(COLUMNAS_SIPE).toHaveLength(25);
    expect(COLUMNAS_SIPE).not.toContain('hidden');
  });

  it('conserva los nombres de la CSS sin tildes ni espacios "corregidos"', () => {
    // Un encabezado "arreglado" es un archivo rechazado.
    expect(COLUMNAS_SIPE).toContain('GastodeRepresentacion');
    expect(COLUMNAS_SIPE).toContain('SalarioenEspecie');
    expect(COLUMNAS_SIPE).toContain('Numero de Documento');
  });
});

describe('identidad', () => {
  it('traduce el tipo de documento al vocabulario de la CSS', () => {
    const { filas } = construirFilasSipe(
      [ident('a'), ident('b', { tipoDocumento: 'pasaporte', documento: 'C0000000' })],
      [],
      catalogo,
    );
    expect(filas[0]!.tipoDocumento).toBe('Cedula');
    expect(filas[1]!.tipoDocumento).toBe('Pasaporte');
  });

  it('rechaza un tipo de documento que la CSS no acepta', () => {
    expect(() =>
      construirFilasSipe([ident('a', { tipoDocumento: 'ruc' })], [], catalogo),
    ).toThrow(/no tiene equivalente en el SIPE/);
  });

  it('copia el documento al seguro social cuando no se capturó uno distinto', () => {
    const { filas } = construirFilasSipe([ident('a', { documento: '8-777-6666' })], [], catalogo);
    expect(filas[0]!.numeroSeguroSocial).toBe('8-777-6666');
  });

  it('respeta el seguro social propio del caso histórico', () => {
    // Hoy coinciden, pero en fichas antiguas la CSS asignó números distintos.
    const { filas } = construirFilasSipe(
      [ident('a', { documento: '8-777-6666', seguroSocial: '12-345-678' })],
      [],
      catalogo,
    );
    expect(filas[0]!.numeroDocumento).toBe('8-777-6666');
    expect(filas[0]!.numeroSeguroSocial).toBe('12-345-678');
  });
});

describe('mapeo de conceptos a casillas', () => {
  it('suma las cinco clases de hora extra y los dos recargos en una sola casilla', () => {
    // La CSS da una casilla; el catálogo distingue siete conceptos con factores
    // distintos. Confirmado con JK: los recargos van aquí también.
    const { filas } = construirFilasSipe(
      [ident('a')],
      [
        linea('a', 'extra_diurna', '10.00'),
        linea('a', 'extra_nocturna', '5.50'),
        linea('a', 'extra_prolonga_mixta_diurna', '2.25'),
        linea('a', 'extra_prolonga_nocturna', '1.00'),
        linea('a', 'extra_mixta_inicio_nocturno', '0.75'),
        linea('a', 'recargo_domingo', '12.00'),
        linea('a', 'recargo_feriado', '4.22'),
      ],
      catalogo,
    );
    expect(filas[0]!.montos.HorasExtras).toBe('35.72');
  });

  it('mantiene separados los dos flujos de ISR (ADR-014)', () => {
    const { filas } = construirFilasSipe(
      [ident('a')],
      [
        linea('a', 'isr_retencion', '10.93'),
        linea('a', 'isr_retencion_gastos_representacion', '25.00'),
        linea('a', 'xiii_mes', '100.00'),
        linea('a', 'xiii_gastos_representacion', '40.00'),
      ],
      catalogo,
    );
    expect(filas[0]!.montos.ImpuestoSobreRenta).toBe('10.93');
    expect(filas[0]!.montos.ImpuestoSobreRentaGastoRepresentacion).toBe('25.00');
    expect(filas[0]!.montos.DecimoTercerMes).toBe('100.00');
    expect(filas[0]!.montos.DecimoTercerMesGastoRepresentacion).toBe('40.00');
  });

  it('no declara a la CSS las retenciones que la propia CSS calcula', () => {
    const { filas, conceptosSinMapear } = construirFilasSipe(
      [ident('a')],
      [
        linea('a', 'salario_ordinario', '750.00'),
        linea('a', 'css_obrero', '73.13'),
        linea('a', 'seguro_educativo_obrero', '9.38'),
        linea('a', 'css_patronal', '99.38'),
        linea('a', 'prestamo', '50.00'),
      ],
      catalogo,
    );
    expect(filas[0]!.montos.Sueldo).toBe('750.00');
    // Omitidos a propósito: no ensucian el aviso de cobertura.
    expect(conceptosSinMapear).toEqual([]);
  });

  it('delata un concepto nuevo sin mapear en vez de perderlo en silencio', () => {
    const { conceptosSinMapear } = construirFilasSipe(
      [ident('a')],
      [linea('a', 'concepto_nuevo_sin_mapear', '99.00')],
      catalogo,
    );
    expect(conceptosSinMapear).toEqual(['concepto_nuevo_sin_mapear']);
  });

  it('revienta ante un concepto fuera del catálogo vigente', () => {
    expect(() =>
      construirFilasSipe([ident('a')], [linea('a', 'inventado', '1.00')], catalogo),
    ).toThrow(/no está en el catálogo vigente/);
  });

  it('no acepta líneas de un colaborador sin identidad', () => {
    expect(() =>
      construirFilasSipe([ident('a')], [linea('fantasma', 'salario_ordinario', '1.00')], catalogo),
    ).toThrow(/sin titular/);
  });
});

describe('aritmética', () => {
  it('suma en decimal exacto, sin el error de la coma flotante', () => {
    // 0.1 + 0.2 en coma flotante da 0.30000000000000004.
    const { filas } = construirFilasSipe(
      [ident('a')],
      [linea('a', 'comisiones', '0.10'), linea('a', 'comisiones', '0.20')],
      catalogo,
    );
    expect(filas[0]!.montos.Comisiones).toBe('0.30');
  });

  it('lee los seis decimales de numeric(18,6) sin arrastrar basura', () => {
    const { filas } = construirFilasSipe(
      [ident('a')],
      [linea('a', 'salario_ordinario', '750.000000')],
      catalogo,
    );
    expect(filas[0]!.montos.Sueldo).toBe('750.00');
  });

  it('escribe cero en las casillas sin movimiento, no celdas vacías', () => {
    const { filas } = construirFilasSipe([ident('a')], [], catalogo);
    expect(filas[0]!.montos.Dividendo).toBe('0.00');
    expect(filas[0]!.montos.Preaviso).toBe('0.00');
  });
});

describe('perfiles reales de julio (montos reales, identidades inventadas)', () => {
  it('declara a quien pasó el mes de vacaciones: sueldo en cero, vacaciones e ISR', () => {
    // El caso que rompe la suposición de que todo el mundo tiene sueldo > 0.
    const { filas } = construirFilasSipe(
      [ident('a')],
      [
        linea('a', 'vacaciones_pagadas', '919.01'),
        linea('a', 'isr_retencion', '10.93'),
      ],
      catalogo,
    );
    expect(filas[0]!.montos.Sueldo).toBe('0.00');
    expect(filas[0]!.montos.Vacaciones).toBe('919.01');
    expect(filas[0]!.montos.ImpuestoSobreRenta).toBe('10.93');
  });

  it('declara sueldo, horas extra y gratificación en la misma fila', () => {
    const { filas } = construirFilasSipe(
      [ident('a')],
      [
        linea('a', 'salario_ordinario', '750.00'),
        linea('a', 'extra_diurna', '35.72'),
        linea('a', 'gratificacion_aguinaldo', '80.00'),
      ],
      catalogo,
    );
    expect(filas[0]!.montos.Sueldo).toBe('750.00');
    expect(filas[0]!.montos.HorasExtras).toBe('35.72');
    expect(filas[0]!.montos.GratificacionAguinaldo).toBe('80.00');
  });

  it('declara XIII, vacaciones y horas extra a la vez', () => {
    const { filas } = construirFilasSipe(
      [ident('a')],
      [
        linea('a', 'salario_ordinario', '414.52'),
        linea('a', 'extra_diurna', '26.71'),
        linea('a', 'xiii_mes', '161.75'),
        linea('a', 'vacaciones_pagadas', '281.48'),
      ],
      catalogo,
    );
    const m = filas[0]!.montos;
    expect([m.Sueldo, m.HorasExtras, m.DecimoTercerMes, m.Vacaciones]).toEqual([
      '414.52',
      '26.71',
      '161.75',
      '281.48',
    ]);
  });

  it('respeta el orden de colaboradores que le da el llamador', () => {
    const { filas } = construirFilasSipe(
      [ident('a', { nombres: 'PRIMERO' }), ident('b', { nombres: 'SEGUNDO' })],
      [],
      catalogo,
    );
    expect(filas.map((f) => f.nombre)).toEqual(['PRIMERO', 'SEGUNDO']);
  });
});
