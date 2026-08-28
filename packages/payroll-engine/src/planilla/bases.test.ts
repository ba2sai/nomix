import { describe, it, expect } from 'vitest';
import { Money, Rate } from '../money.js';
import { CatalogoConceptos, type Concepto } from '../catalogo.js';
import { acumularBases, baseCssGeneral, gruposCssEspeciales } from './bases.js';
import { calcularSeguridadSocial, type TasasSeguridadSocial } from '../seguridad-social/css.js';

/** Fila de catálogo con los flags en false; cada test enciende los que necesita. */
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
    baseLegal: 'test',
    confianza: 'verificado',
    ...parcial,
  };
}

const cotizable = { incideCss: true, incideSeguroEducativo: true, incideIsr: true } as const;

const catalogo = new CatalogoConceptos([
  concepto('salario_ordinario', { ...cotizable, incideBaseXiii: true, incideBaseLiquidacion: true }),
  concepto('extra_diurna', { ...cotizable, incideBaseXiii: true }),
  concepto('vacaciones_pagadas', { ...cotizable, incideBaseXiii: true, esInembargable: true }),
  concepto('gastos_representacion', { incideIsr: true, regimenIsr: 'gastos_representacion' }),
  concepto('prima_antiguedad', { incideIsr: true, regimenIsr: 'exento' }),
  concepto('xiii_mes', { incideCss: true, tasaCssEspecial: Rate.of('0.0725') }),
  concepto('descuento_ausencia', { tipo: 'deduccion', unidad: 'dias', ...cotizable }),
  concepto('css_obrero', { tipo: 'deduccion' }),
  concepto('css_patronal', { tipo: 'aporte_patronal', incideCss: true }),
  concepto('bono_sin_verificar', { ...cotizable, confianza: 'pendiente' }),
]);

/**
 * La misma prueba de aceptación que `css.test.ts`, pero con la base armada por
 * el catálogo en vez de sumada a mano. Es la prueba de que la vía dirigida por
 * datos reproduce la vía cableada al centavo.
 *
 * Origen: asiento contable de El Príncipe Azul, junio 2026 (doc 09 §1).
 */
describe('acumularBases — asiento real jun-2026 reconstruido por el catálogo', () => {
  const lineas = [
    { conceptoCodigo: 'salario_ordinario', monto: Money.of('6114.65') },
    { conceptoCodigo: 'extra_diurna', monto: Money.of('123.93') },
    { conceptoCodigo: 'vacaciones_pagadas', monto: Money.of('806.83') },
  ];
  const bases = acumularBases(lineas, catalogo);

  const tasas: TasasSeguridadSocial = {
    cssObrero: Rate.of('0.0975'),
    cssPatronal: Rate.of('0.1325'), // Ley 462 de 2025
    seObrero: Rate.of('0.0125'),
    sePatronal: Rate.of('0.0150'),
    riesgosProfesionales: Rate.of('0'),
  };
  const r = calcularSeguridadSocial(baseCssGeneral(bases), tasas);

  it('la base cotizable acumulada es 7045.41', () => {
    expect(baseCssGeneral(bases).toFixed2()).toBe('7045.41');
  });

  it('CSS obrero = 686.93', () => {
    expect(r.cssObrero.monto.toFixed2()).toBe('686.93');
  });

  it('Seguro Educativo obrero = 88.07', () => {
    expect(r.seObrero.monto.toFixed2()).toBe('88.07');
  });

  it('CSS patronal (13.25%) = 933.52', () => {
    expect(r.cssPatronal.monto.toFixed2()).toBe('933.52');
  });

  it('Seguro Educativo patronal = 105.68', () => {
    expect(r.sePatronal.monto.toFixed2()).toBe('105.68');
  });

  it('la base de Seguro Educativo coincide con la de CSS general', () => {
    expect(bases.seguroEducativo.toFixed2()).toBe('7045.41');
  });

  it('todos los conceptos usados están verificados', () => {
    expect(bases.conceptosPendientes).toEqual([]);
  });
});

describe('acumularBases — exclusión por flag', () => {
  const lineas = [
    { conceptoCodigo: 'salario_ordinario', monto: Money.of('6114.65') },
    { conceptoCodigo: 'extra_diurna', monto: Money.of('123.93') },
    { conceptoCodigo: 'vacaciones_pagadas', monto: Money.of('806.83') },
    { conceptoCodigo: 'gastos_representacion', monto: Money.of('1500.00') },
  ];
  const bases = acumularBases(lineas, catalogo);

  it('los gastos de representación NO mueven la base de CSS', () => {
    expect(baseCssGeneral(bases).toFixed2()).toBe('7045.41');
  });

  it('tampoco mueven la base de Seguro Educativo', () => {
    expect(bases.seguroEducativo.toFixed2()).toBe('7045.41');
  });

  it('van a su propio flujo de ISR (columna separada del Formulario 03)', () => {
    expect(bases.isr.gastosRepresentacion.toFixed2()).toBe('1500.00');
    expect(bases.isr.ordinario.toFixed2()).toBe('7045.41');
  });

  it('un concepto exento no suma en ninguna base gravable', () => {
    const conExento = acumularBases(
      [...lineas, { conceptoCodigo: 'prima_antiguedad', monto: Money.of('900.00') }],
      catalogo,
    );
    expect(conExento.isr.ordinario.toFixed2()).toBe('7045.41');
    expect(conExento.isr.gastosRepresentacion.toFixed2()).toBe('1500.00');
  });
});

describe('acumularBases — regímenes de tasa (ADR-002)', () => {
  const bases = acumularBases(
    [
      { conceptoCodigo: 'salario_ordinario', monto: Money.of('1000.00') },
      { conceptoCodigo: 'xiii_mes', monto: Money.of('400.00') },
    ],
    catalogo,
  );

  it('el XIII no se mezcla con la base general', () => {
    expect(baseCssGeneral(bases).toFixed2()).toBe('1000.00');
  });

  it('el XIII forma su propio grupo al 7.25%', () => {
    const especiales = gruposCssEspeciales(bases);
    expect(especiales).toHaveLength(1);
    expect(especiales[0]!.base.toFixed2()).toBe('400.00');
    expect(especiales[0]!.tasaEspecial!.toPercentString()).toBe('7.2500%');
  });
});

describe('acumularBases — signo por tipo de concepto', () => {
  it('una ausencia reduce la base cotizable sin caso especial', () => {
    const bases = acumularBases(
      [
        { conceptoCodigo: 'salario_ordinario', monto: Money.of('1000.00') },
        { conceptoCodigo: 'descuento_ausencia', monto: Money.of('100.00') },
      ],
      catalogo,
    );
    expect(baseCssGeneral(bases).toFixed2()).toBe('900.00');
  });

  it('una retención que no incide no participa en ninguna base', () => {
    const bases = acumularBases(
      [
        { conceptoCodigo: 'salario_ordinario', monto: Money.of('1000.00') },
        { conceptoCodigo: 'css_obrero', monto: Money.of('97.50') },
      ],
      catalogo,
    );
    expect(baseCssGeneral(bases).toFixed2()).toBe('1000.00');
  });

  it('un aporte patronal es resultado, no insumo: nunca entra en las bases', () => {
    const bases = acumularBases(
      [
        { conceptoCodigo: 'salario_ordinario', monto: Money.of('1000.00') },
        { conceptoCodigo: 'css_patronal', monto: Money.of('132.50') },
      ],
      catalogo,
    );
    expect(baseCssGeneral(bases).toFixed2()).toBe('1000.00');
  });
});

describe('acumularBases — honestidad sobre la confianza', () => {
  it('reporta los conceptos cuya incidencia no está verificada', () => {
    const bases = acumularBases(
      [
        { conceptoCodigo: 'salario_ordinario', monto: Money.of('1000.00') },
        { conceptoCodigo: 'bono_sin_verificar', monto: Money.of('50.00') },
      ],
      catalogo,
    );
    expect(bases.conceptosPendientes).toEqual(['bono_sin_verificar']);
  });
});

describe('CatalogoConceptos — falla ruidosamente', () => {
  it('un concepto desconocido es un error, no un default silencioso', () => {
    expect(() =>
      acumularBases([{ conceptoCodigo: 'inventado', monto: Money.of('1.00') }], catalogo),
    ).toThrow(/no está en el catálogo/);
  });

  it('rechaza códigos duplicados al construir el catálogo', () => {
    expect(() => new CatalogoConceptos([concepto('x'), concepto('x')])).toThrow(/duplicado/);
  });
});
