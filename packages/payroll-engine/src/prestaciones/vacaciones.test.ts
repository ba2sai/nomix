import { describe, it, expect } from 'vitest';
import { Money } from '../money.js';
import { calcularCicloVacaciones, type InsumoCicloVacaciones } from './vacaciones.js';

const base = {
  divisor: '11',
  diasCicloCompleto: '330',
  concepto: 'vacaciones_pagadas',
  baseLegal: 'Código de Trabajo Art. 54',
} as const;

describe('calcularCicloVacaciones — fórmula del Art. 54 (÷11)', () => {
  it('un ciclo completo de 330 días paga un mes de salario promedio', () => {
    // 11 quincenas de 1000 + 11 de 1000 → salario mensual constante 2000/mes × 11 = 22000
    const r = calcularCicloVacaciones({
      ...base,
      salariosDelCiclo: Money.of('22000'),
      diasCiclo: 330,
    });
    expect(r.linea.monto.toFixed2()).toBe('2000.00');
    expect(r.cicloCompleto).toBe(true);
  });

  it('un ciclo parcial acumula menos por construcción, sin prorrateo aparte', () => {
    const r = calcularCicloVacaciones({ ...base, salariosDelCiclo: Money.of('11000'), diasCiclo: 165 });
    expect(r.linea.monto.toFixed2()).toBe('1000.00');
    expect(r.cicloCompleto).toBe(false);
  });

  it('los días acumulados son diasCiclo ÷ 11', () => {
    const r = calcularCicloVacaciones({ ...base, salariosDelCiclo: Money.of('11000'), diasCiclo: 165 });
    expect(r.diasAcumulados.decimal.toFixed(4)).toBe('15.0000');
  });

  it('la base de la línea es la suma del ciclo, no el monto pagado', () => {
    const r = calcularCicloVacaciones({ ...base, salariosDelCiclo: Money.of('22000'), diasCiclo: 330 });
    expect(r.linea.base.toFixed2()).toBe('22000.00');
  });

  it('sin salarios en el ciclo el monto es cero y no revienta la tasa', () => {
    const r = calcularCicloVacaciones({ ...base, salariosDelCiclo: Money.ZERO, diasCiclo: 0 });
    expect(r.linea.monto.toFixed2()).toBe('0.00');
    expect(r.cicloCompleto).toBe(false);
    expect(r.linea.tasa.toPercentString()).toBe('9.0909%');
  });

  it('un ciclo que excede los 330 días (pago tardío) sigue completo, no se topa', () => {
    const r = calcularCicloVacaciones({ ...base, salariosDelCiclo: Money.of('24000'), diasCiclo: 360 });
    expect(r.cicloCompleto).toBe(true);
    expect(r.linea.monto.toFixed2()).toBe('2181.82');
  });

  it('la tasa de la traza es 1/11 cuando el monto es proporcional al ciclo', () => {
    const r = calcularCicloVacaciones({ ...base, salariosDelCiclo: Money.of('22000'), diasCiclo: 330 });
    expect(r.linea.tasa.toPercentString()).toBe('9.0909%');
  });
});
