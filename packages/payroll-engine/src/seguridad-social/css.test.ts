import { describe, it, expect } from 'vitest';
import { Money, Rate } from '../money.js';
import { calcularSeguridadSocial, type TasasSeguridadSocial } from './css.js';

/**
 * Prueba de aceptación contra datos de producción reales.
 *
 * Origen: asiento contable de El Príncipe Azul, S.A., junio 2026
 * (reportes PFacil/asiento_planilla.pdf, ver docs/nomix/09 §1).
 * Todos los montos deben cuadrar al centavo.
 */
describe('Seguridad Social — validación contra asiento real (jun-2026)', () => {
  // Tasas vigentes en jun-2026, tal como las resolvería la config por fecha (ADR-001).
  const tasas: TasasSeguridadSocial = {
    cssObrero: Rate.of('0.0975'),
    cssPatronal: Rate.of('0.1325'), // Ley 462 de 2025 — la corrección clave
    seObrero: Rate.of('0.0125'),
    sePatronal: Rate.of('0.0150'),
    riesgosProfesionales: Rate.of('0'), // El Príncipe Azul figura con RP en 0.00
  };

  // Base cotizable = salarios 6114.65 + horas extra 123.93 + vacaciones 806.83.
  const baseCotizable = Money.of('6114.65').plus(Money.of('123.93')).plus(Money.of('806.83'));

  it('la base cotizable es 7045.41', () => {
    expect(baseCotizable.toFixed2()).toBe('7045.41');
  });

  const r = calcularSeguridadSocial(baseCotizable, tasas);

  it('CSS obrero (9.75%) = 686.93', () => {
    expect(r.cssObrero.monto.toFixed2()).toBe('686.93');
  });

  it('Seguro Educativo obrero (1.25%) = 88.07', () => {
    expect(r.seObrero.monto.toFixed2()).toBe('88.07');
  });

  it('CSS patronal (13.25%, Ley 462) = 933.52', () => {
    expect(r.cssPatronal.monto.toFixed2()).toBe('933.52');
  });

  it('Seguro Educativo patronal (1.50%) = 105.68', () => {
    expect(r.sePatronal.monto.toFixed2()).toBe('105.68');
  });

  it('la tasa patronal implícita es exactamente 13.25%', () => {
    expect(r.cssPatronal.tasa.toPercentString()).toBe('13.2500%');
  });

  it('el neto (salarios por pagar) cuadra: base − obrero − ISR = 6269.09', () => {
    const isrObrero = Money.of('1.32');
    const neto = baseCotizable.minus(r.totalObrero).minus(isrObrero);
    expect(neto.toFixed2()).toBe('6269.09');
  });

  it('el asiento cuadra: débito = crédito = 8084.61', () => {
    const debito = baseCotizable.plus(r.cssPatronal.monto).plus(r.sePatronal.monto);
    expect(debito.toFixed2()).toBe('8084.61');
  });
});

describe('Money — protecciones ADR-006', () => {
  it('rechaza construir un monto desde un number con decimales', () => {
    expect(() => Money.of(3.14)).toThrow(/decimales/);
  });

  it('Money.max implementa la regla del aguinaldo (Decreto 19/1973 Art. 3º)', () => {
    const tercuartaPartida = Money.of('200.00');
    const aguinaldo = Money.of('220.00');
    expect(Money.max(tercuartaPartida, aguinaldo).toFixed2()).toBe('220.00');
  });
});
