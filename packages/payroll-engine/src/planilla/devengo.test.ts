import { describe, it, expect } from 'vitest';
import { Money, Rate } from '../money.js';
import {
  devengarSalarioBase,
  devengarHoras,
  devengarDias,
  salarioHora,
  diasDelPeriodo,
  type ParametrosDevengo,
} from './devengo.js';

const mitadMensual: ParametrosDevengo = {
  metodo: 'mitad_mensual',
  periodosPorMes: '2',
  divisorDiario: '30',
  horasMensuales: '208',
};
const diasReales: ParametrosDevengo = { ...mitadMensual, metodo: 'dias_reales' };

describe('diasDelPeriodo', () => {
  it('cuenta ambos extremos: 1–15 son 15 días', () => {
    expect(diasDelPeriodo({ desde: '2026-01-01', hasta: '2026-01-15' })).toBe(15);
  });

  it('la 2ª quincena de enero tiene 16 días', () => {
    expect(diasDelPeriodo({ desde: '2026-01-16', hasta: '2026-01-31' })).toBe(16);
  });

  it('la 2ª quincena de febrero tiene 13 días', () => {
    expect(diasDelPeriodo({ desde: '2026-02-16', hasta: '2026-02-28' })).toBe(13);
  });

  it('rechaza un período invertido', () => {
    expect(() => diasDelPeriodo({ desde: '2026-02-28', hasta: '2026-02-16' })).toThrow(/antes de empezar/);
  });
});

/**
 * La pregunta que el doc 05 §2 marca como "cambia todos los netos del sistema".
 * Se resolvió como parámetro por empresa, así que el motor debe dar ambos
 * resultados y ambos deben ser exactos.
 */
describe('devengarSalarioBase — las dos convenciones de prorrateo', () => {
  const salario = Money.of('1200.00');
  const enero2 = { desde: '2026-01-16', hasta: '2026-01-31' }; // 16 días
  const febrero2 = { desde: '2026-02-16', hasta: '2026-02-28' }; // 13 días

  it('mitad_mensual paga lo mismo en enero y en febrero', () => {
    expect(devengarSalarioBase(salario, enero2, mitadMensual).monto.toFixed2()).toBe('600.00');
    expect(devengarSalarioBase(salario, febrero2, mitadMensual).monto.toFixed2()).toBe('600.00');
  });

  it('dias_reales paga distinto: 16/30 en enero, 13/30 en febrero', () => {
    expect(devengarSalarioBase(salario, enero2, diasReales).monto.toFixed2()).toBe('640.00');
    expect(devengarSalarioBase(salario, febrero2, diasReales).monto.toFixed2()).toBe('520.00');
  });

  it('deja constancia de la proporción aplicada para la traza', () => {
    expect(devengarSalarioBase(salario, enero2, mitadMensual).tasa.toPercentString()).toBe('50.0000%');
    expect(devengarSalarioBase(salario, febrero2, diasReales).tasa.toPercentString()).toBe('43.3333%');
  });

  it('no redondea el intermedio: un salario indivisible conserva precisión', () => {
    const raro = Money.of('1000.00');
    const linea = devengarSalarioBase(raro, febrero2, diasReales); // 1000/30*13
    expect(linea.monto.toFixed2()).toBe('433.33');
    // El valor interno mantiene los decimales completos (ADR-006).
    expect(linea.monto.toString().startsWith('433.3333')).toBe(true);
  });
});

describe('salarioHora — base legal §12.1', () => {
  it('salario mensual ÷ horas mensuales', () => {
    expect(salarioHora(Money.of('1040.00'), '208').toFixed2()).toBe('5.00');
  });

  it('la jornada reducida usa 192', () => {
    expect(salarioHora(Money.of('960.00'), '192').toFixed2()).toBe('5.00');
  });
});

/**
 * Art. 33: el recargo se SUMA al valor de la hora. La extra diurna se paga al
 * 125%, no al 25% — es el error clásico y el motor tiene que blindarlo.
 */
describe('devengarHoras — recargos del Art. 33', () => {
  const salario = Money.of('1040.00'); // hora ordinaria = 5.00

  it('extra diurna (+25%) paga 6.25 la hora', () => {
    const l = devengarHoras('extra_diurna', '1', salario, Rate.of('0.25'), mitadMensual, 'Art. 33');
    expect(l.monto.toFixed2()).toBe('6.25');
    expect(l.tasa.toPercentString()).toBe('125.0000%');
  });

  it('extra nocturna (+50%) paga 7.50 la hora', () => {
    const l = devengarHoras('extra_nocturna', '1', salario, Rate.of('0.50'), mitadMensual, 'Art. 33');
    expect(l.monto.toFixed2()).toBe('7.50');
  });

  it('mixta de inicio nocturno (+75%) paga 8.75 la hora', () => {
    const l = devengarHoras(
      'extra_mixta_inicio_nocturno', '1', salario, Rate.of('0.75'), mitadMensual, 'Art. 33',
    );
    expect(l.monto.toFixed2()).toBe('8.75');
  });

  it('día de fiesta (+150%) paga 12.50 la hora — Art. 49', () => {
    const l = devengarHoras('recargo_feriado', '1', salario, Rate.of('1.50'), mitadMensual, 'Art. 49');
    expect(l.monto.toFixed2()).toBe('12.50');
  });

  it('escala con la cantidad de horas', () => {
    const l = devengarHoras('extra_diurna', '3.5', salario, Rate.of('0.25'), mitadMensual, 'Art. 33');
    expect(l.monto.toFixed2()).toBe('21.88'); // 5.00 × 3.5 × 1.25 = 21.875 → HALF_UP
  });
});

describe('devengarDias — ausencias', () => {
  it('descuenta el salario diario por cada día', () => {
    const l = devengarDias('descuento_ausencia', '2', Money.of('1200.00'), mitadMensual, 'Art. 138');
    expect(l.monto.toFixed2()).toBe('80.00'); // 1200/30 × 2
  });
});

/**
 * Caso real de la planilla quincenal de PlaniFácil (doc 09 §1): GONZALEZ,
 * ÁNGEL GABRIEL — bruto 204.70 + 8.24 de horas extra = 212.94, CSS+SE obrero
 * 11% = 23.42, neto 189.52.
 */
describe('caso quincenal real — GONZALEZ (doc 09 §1)', () => {
  it('el 11% obrero sobre bruto + horas extra da un neto de 189.52', () => {
    const bruto = Money.of('204.70').plus(Money.of('8.24'));
    expect(bruto.toFixed2()).toBe('212.94');
    const css = bruto.times(Rate.of('0.0975')).round(2);
    const se = bruto.times(Rate.of('0.0125')).round(2);
    expect(css.plus(se).toFixed2()).toBe('23.42');
    expect(bruto.minus(css).minus(se).toFixed2()).toBe('189.52');
  });
});
