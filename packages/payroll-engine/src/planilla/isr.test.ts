import { describe, it, expect } from 'vitest';
import { Money, Rate } from '../money.js';
import { calcularImpuestoTramos, calcularIsrAcumulativo, type Tramo } from './isr.js';

/** Tabla del Art. 700 CF (base legal §4.1). */
const TRAMOS_ISR: Tramo[] = [
  { hasta: Money.of('11000.00'), tasa: Rate.of('0'), baseFija: Money.ZERO },
  { hasta: Money.of('50000.00'), tasa: Rate.of('0.15'), baseFija: Money.ZERO },
  { hasta: null, tasa: Rate.of('0.25'), baseFija: Money.of('5850.00') },
];

/** Escala de gastos de representación (Art. 701 lit. l CF, base legal §4.4). */
const TRAMOS_GASTOS_REP: Tramo[] = [
  { hasta: Money.of('25000.00'), tasa: Rate.of('0.10'), baseFija: Money.ZERO },
  { hasta: null, tasa: Rate.of('0.15'), baseFija: Money.of('2500.00') },
];

describe('calcularImpuestoTramos — Art. 700 CF', () => {
  it('exento hasta 11,000', () => {
    expect(calcularImpuestoTramos(Money.of('11000.00'), TRAMOS_ISR).toFixed2()).toBe('0.00');
    expect(calcularImpuestoTramos(Money.of('5000.00'), TRAMOS_ISR).toFixed2()).toBe('0.00');
  });

  it('15% sobre el excedente de 11,000 (no de 11,000.01)', () => {
    // 15,000 → excedente 4,000 → 600.00
    expect(calcularImpuestoTramos(Money.of('15000.00'), TRAMOS_ISR).toFixed2()).toBe('600.00');
  });

  it('el límite exacto del segundo tramo (50,000) da 5,850', () => {
    expect(calcularImpuestoTramos(Money.of('50000.00'), TRAMOS_ISR).toFixed2()).toBe('5850.00');
  });

  it('25% + base fija sobre el excedente de 50,000', () => {
    // 60,000 → 5850 + 0.25*10000 = 8350.00
    expect(calcularImpuestoTramos(Money.of('60000.00'), TRAMOS_ISR).toFixed2()).toBe('8350.00');
  });

  it('renta cero no tributa', () => {
    expect(calcularImpuestoTramos(Money.ZERO, TRAMOS_ISR).toFixed2()).toBe('0.00');
  });

  it('escala de gastos de representación: 10% hasta 25,000', () => {
    expect(calcularImpuestoTramos(Money.of('20000.00'), TRAMOS_GASTOS_REP).toFixed2()).toBe('2000.00');
  });

  it('escala de gastos de representación: 2,500 + 15% sobre el excedente de 25,000', () => {
    // 30,000 → 2500 + 0.15*5000 = 3250.00
    expect(calcularImpuestoTramos(Money.of('30000.00'), TRAMOS_GASTOS_REP).toFixed2()).toBe('3250.00');
  });

  it('lanza si ningún tramo cubre la renta (tabla mal formada, sin tramo sin techo)', () => {
    const incompleta: Tramo[] = [{ hasta: Money.of('100'), tasa: Rate.of('0'), baseFija: Money.ZERO }];
    expect(() => calcularImpuestoTramos(Money.of('200'), incompleta)).toThrow(/no cubre/);
  });
});

describe('calcularIsrAcumulativo — método acumulativo (ADR-014)', () => {
  it('primer período del año, ingreso bajo el exento: retención 0', () => {
    const l = calcularIsrAcumulativo({
      baseGravablePeriodo: Money.of('850.00'),
      baseGravableAcumuladaAnterior: Money.ZERO,
      retenidoAcumuladoAnterior: Money.ZERO,
      deduccionesPersonalesAnuales: Money.ZERO,
      tramos: TRAMOS_ISR,
      concepto: 'isr_retencion',
      baseLegal: 'Art. 700 CF',
    });
    expect(l.monto.toFixed2()).toBe('0.00');
    expect(l.base.toFixed2()).toBe('850.00');
  });

  it('cruza el umbral exento a mitad de año: retiene sobre el excedente acumulado', () => {
    // Acumulado antes de este período: 10,800 (sin retención, todo exento).
    // Este período suma 1,000 → acumulado 11,800 → impuesto causado = 0.15*800 = 120.00.
    // Nada retenido antes → retención de este período = 120.00.
    const l = calcularIsrAcumulativo({
      baseGravablePeriodo: Money.of('1000.00'),
      baseGravableAcumuladaAnterior: Money.of('10800.00'),
      retenidoAcumuladoAnterior: Money.ZERO,
      deduccionesPersonalesAnuales: Money.ZERO,
      tramos: TRAMOS_ISR,
      concepto: 'isr_retencion',
      baseLegal: 'Art. 700 CF',
    });
    expect(l.monto.toFixed2()).toBe('120.00');
  });

  it('período estable ya dentro del tramo del 15%: retiene solo el incremental', () => {
    // Acumulado antes: 12,000 → causado antes = 0.15*1000 = 150.00, ya retenido 150.00.
    // Este período suma 1,000 → acumulado 13,000 → causado = 0.15*2000 = 300.00.
    // Retención de este período = 300.00 - 150.00 = 150.00 (no 300.00 de nuevo).
    const l = calcularIsrAcumulativo({
      baseGravablePeriodo: Money.of('1000.00'),
      baseGravableAcumuladaAnterior: Money.of('12000.00'),
      retenidoAcumuladoAnterior: Money.of('150.00'),
      deduccionesPersonalesAnuales: Money.ZERO,
      tramos: TRAMOS_ISR,
      concepto: 'isr_retencion',
      baseLegal: 'Art. 700 CF',
    });
    expect(l.monto.toFixed2()).toBe('150.00');
  });

  it('no reembolsa a mitad de año: si el causado acumulado no sube, retiene 0 (nunca negativo)', () => {
    // Ya se retuvo más de lo que el acumulado (con este período) causa —
    // p. ej. una deducción declarada a mitad de año. La función no devuelve
    // el exceso; eso es un ajuste de cierre, fuera de este cálculo.
    const l = calcularIsrAcumulativo({
      baseGravablePeriodo: Money.of('100.00'),
      baseGravableAcumuladaAnterior: Money.of('12000.00'),
      retenidoAcumuladoAnterior: Money.of('500.00'), // más de lo que 12,100 causaría (165.00)
      deduccionesPersonalesAnuales: Money.ZERO,
      tramos: TRAMOS_ISR,
      concepto: 'isr_retencion',
      baseLegal: 'Art. 700 CF',
    });
    expect(l.monto.toFixed2()).toBe('0.00');
  });

  it('las deducciones personales anuales reducen la renta neta gravable', () => {
    // Acumulado 12,000, deducción anual 2,000 → renta neta 10,000 → exento.
    const l = calcularIsrAcumulativo({
      baseGravablePeriodo: Money.of('1000.00'),
      baseGravableAcumuladaAnterior: Money.of('11000.00'),
      retenidoAcumuladoAnterior: Money.ZERO,
      deduccionesPersonalesAnuales: Money.of('2000.00'),
      tramos: TRAMOS_ISR,
      concepto: 'isr_retencion',
      baseLegal: 'Art. 700 CF',
    });
    expect(l.monto.toFixed2()).toBe('0.00');
  });

  it('la base de la línea es la del período, no la acumulada (evita doble conteo al sumar históricos)', () => {
    const l = calcularIsrAcumulativo({
      baseGravablePeriodo: Money.of('1000.00'),
      baseGravableAcumuladaAnterior: Money.of('20000.00'),
      retenidoAcumuladoAnterior: Money.of('1350.00'),
      deduccionesPersonalesAnuales: Money.ZERO,
      tramos: TRAMOS_ISR,
      concepto: 'isr_retencion',
      baseLegal: 'Art. 700 CF',
    });
    expect(l.base.toFixed2()).toBe('1000.00');
  });

  it('flujo separado de gastos de representación con su propia escala', () => {
    const l = calcularIsrAcumulativo({
      baseGravablePeriodo: Money.of('3000.00'),
      baseGravableAcumuladaAnterior: Money.of('22000.00'),
      retenidoAcumuladoAnterior: Money.of('2200.00'), // 0.10*22000
      deduccionesPersonalesAnuales: Money.ZERO,
      tramos: TRAMOS_GASTOS_REP,
      concepto: 'isr_retencion_gastos_representacion',
      baseLegal: 'Art. 701 lit. l CF',
    });
    // Acumulado 25,000 → causado = 2500.00 (límite exacto). Retención = 300.00.
    expect(l.monto.toFixed2()).toBe('300.00');
  });
});
