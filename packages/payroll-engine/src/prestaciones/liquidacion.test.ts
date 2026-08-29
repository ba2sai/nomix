import { describe, it, expect } from 'vitest';
import { Money, Rate } from '../money.js';
import {
  calcularLiquidacion,
  semanasIndemnizacion,
  type TramoIndemnizacion,
} from './liquidacion.js';

/** Escala vigente del Art. 225 desde la Ley 44 de 1995. */
const ESCALA: readonly TramoIndemnizacion[] = [
  { hastaAnios: 10, semanasPorAnio: '3.4' },
  { hastaAnios: null, semanasPorAnio: '1' },
];

const base = {
  salarioMensual: Money.of('1000'),
  divisorSemanal: '4.333',
  fraccionAnio: '0',
  escalaIndemnizacion: ESCALA,
  semanasPrimaPorAnio: '1',
  semanasMinimasIndemnizacion: '1',
  semanasPreaviso: null,
} as const;

describe('semanasIndemnizacion — escala progresiva del Art. 225', () => {
  it('dentro de los primeros 10 años son 3.4 semanas por año', () => {
    expect(semanasIndemnizacion(Rate.of('5'), ESCALA).decimal.toFixed(2)).toBe('17.00');
  });

  it('exactamente 10 años son 34 semanas', () => {
    expect(semanasIndemnizacion(Rate.of('10'), ESCALA).decimal.toFixed(2)).toBe('34.00');
  });

  it('15 años son 34 + 5 = 39 semanas, no 15 × 3.4 ni 15 × 1', () => {
    // El ejemplo textual de la base legal §8.3.
    expect(semanasIndemnizacion(Rate.of('15'), ESCALA).decimal.toFixed(2)).toBe('39.00');
  });

  it('acumula la fracción de año dentro de su tramo', () => {
    // 10.5 años → 34 + 0.5 = 34.5 semanas
    expect(semanasIndemnizacion(Rate.of('10.5'), ESCALA).decimal.toFixed(2)).toBe('34.50');
  });

  it('una antigüedad menor a un año da la fracción proporcional', () => {
    expect(semanasIndemnizacion(Rate.of('0.5'), ESCALA).decimal.toFixed(2)).toBe('1.70');
  });
});

/**
 * ⚠️ Discrepancia deliberada con el ejemplo textual de la base legal §8.3.
 *
 * El documento calcula `1000 / 4.333 = 230.79` (redondeando el semanal) y luego
 * `230.79 × 39 = 9,000.81`. El motor NO redondea el intermedio (ADR-006:
 * "nunca redondear resultados intermedios encadenados") y llega a 9,000.69.
 *
 * Son 12 centavos sobre una indemnización real. Cuál de los dos acepta MITRADEL
 * es exactamente la consulta **F4**, todavía sin responder. Estos tests fijan el
 * comportamiento ADR-006 y dejan la diferencia VISIBLE: si la respuesta a F4
 * resulta ser "se redondea cada concepto", este es el test que hay que cambiar,
 * y el que explica por qué.
 */
describe('calcularLiquidacion — ejemplo de la base legal §8.3, con precisión ADR-006', () => {
  const r = calcularLiquidacion({
    ...base,
    aniosServicio: 15,
    causa: 'despido_injustificado',
  });

  it('el salario semanal presentado es mensual ÷ 4.333', () => {
    expect(r.salarioSemanal.toFixed2()).toBe('230.79');
  });

  it('39 semanas dan 9,000.69 — no los 9,000.81 del ejemplo, que redondea el semanal', () => {
    const indem = r.lineas.find((l) => l.concepto === 'indemnizacion');
    expect(indem?.monto.toFixed2()).toBe('9000.69');
  });

  it('la diferencia con el ejemplo es exactamente el redondeo intermedio', () => {
    const conSemanalRedondeado = Money.of('230.79').times('39');
    const delMotor = r.lineas.find((l) => l.concepto === 'indemnizacion')?.monto ?? Money.ZERO;
    expect(conSemanalRedondeado.minus(delMotor).toFixed2()).toBe('0.12');
  });

  it('declara la convención de redondeo como consulta abierta (F4)', () => {
    expect(r.advertencias.some((a) => a.includes('F4'))).toBe(true);
  });
});

describe('calcularLiquidacion — qué procede según la causa', () => {
  it('la prima de antigüedad se paga también en una renuncia (Art. 224)', () => {
    const r = calcularLiquidacion({ ...base, aniosServicio: 5, causa: 'renuncia' });
    expect(r.lineas.find((l) => l.concepto === 'prima_antiguedad')?.monto.toFixed2()).toBe('1153.93');
  });

  it('una renuncia NO genera indemnización del Art. 225', () => {
    const r = calcularLiquidacion({ ...base, aniosServicio: 5, causa: 'renuncia' });
    expect(r.lineas.some((l) => l.concepto === 'indemnizacion')).toBe(false);
  });

  it('un despido justificado tampoco genera indemnización', () => {
    const r = calcularLiquidacion({ ...base, aniosServicio: 5, causa: 'despido_justificado' });
    expect(r.lineas.some((l) => l.concepto === 'indemnizacion')).toBe(false);
    expect(r.lineas.some((l) => l.concepto === 'prima_antiguedad')).toBe(true);
  });

  it('una renuncia justificada SÍ genera indemnización', () => {
    const r = calcularLiquidacion({ ...base, aniosServicio: 5, causa: 'renuncia_justificada' });
    expect(r.lineas.some((l) => l.concepto === 'indemnizacion')).toBe(true);
  });
});

describe('calcularLiquidacion — mínimo absoluto y preaviso', () => {
  it('aplica el mínimo de 1 semana cuando la escala da menos, y lo advierte', () => {
    const r = calcularLiquidacion({
      ...base,
      aniosServicio: 0,
      fraccionAnio: '0.1', // 0.1 × 3.4 = 0.34 semanas → sube a 1
      causa: 'despido_injustificado',
    });
    expect(r.lineas.find((l) => l.concepto === 'indemnizacion')?.monto.toFixed2()).toBe('230.79');
    expect(r.advertencias.some((a) => a.includes('mínimo absoluto'))).toBe(true);
  });

  it('el preaviso no otorgado por el empleador suma a favor del trabajador', () => {
    const r = calcularLiquidacion({
      ...base,
      aniosServicio: 3,
      causa: 'despido_injustificado',
      semanasPreaviso: '4.286', // 30 días
    });
    const pre = r.lineas.find((l) => l.concepto === 'preaviso');
    expect(pre?.monto.isNegative()).toBe(false);
  });

  it('la renuncia sin aviso resta 1 semana a cargo del trabajador (Art. 222)', () => {
    const r = calcularLiquidacion({
      ...base,
      aniosServicio: 3,
      causa: 'renuncia',
      semanasPreaviso: '-1',
    });
    const pre = r.lineas.find((l) => l.concepto === 'preaviso_a_cargo_trabajador');
    expect(pre?.monto.toFixed2()).toBe('-230.79');
    expect(r.advertencias.some((a) => a.includes('D5.c'))).toBe(true);
  });

  it('el total suma las líneas con su signo', () => {
    const r = calcularLiquidacion({
      ...base,
      aniosServicio: 3,
      causa: 'renuncia',
      semanasPreaviso: '-1',
    });
    // prima 3 semanas − preaviso 1 semana = 2 semanas netas, sin redondeo intermedio.
    expect(r.total.toFixed2()).toBe('461.57');
  });
});

describe('calcularLiquidacion — honestidad sobre lo que no está resuelto', () => {
  it('siempre declara que el salario base depende de la consulta D2', () => {
    const r = calcularLiquidacion({ ...base, aniosServicio: 5, causa: 'renuncia' });
    expect(r.advertencias.some((a) => a.includes('consulta D2'))).toBe(true);
  });
});
