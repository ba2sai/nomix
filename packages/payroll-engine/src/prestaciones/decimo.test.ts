import { describe, it, expect } from 'vitest';
import { Money } from '../money.js';
import { resolverPartida, calcularPartidaXiii, type DefinicionPartida } from './decimo.js';

/**
 * Las tres partidas tal como las siembra `regla.partidas_xiii` (base legal §3.1).
 * Aquí van literales porque son el INSUMO de la prueba, no una constante del
 * motor: en producción llegan desde la configuración versionada (ADR-001).
 */
const PARTIDAS: readonly DefinicionPartida[] = [
  { numero: 1, desde: '12-16', hasta: '04-15' },
  { numero: 2, desde: '04-16', hasta: '08-15' },
  { numero: 3, desde: '08-16', hasta: '12-15' },
];

describe('resolverPartida — ciclo del Decreto 221 de 1971', () => {
  it('el 15 de abril paga la 1ª partida, acumulada desde el 16 de diciembre anterior', () => {
    expect(resolverPartida('2026-04-15', PARTIDAS)).toEqual({
      numero: 1,
      desde: '2025-12-16',
      hasta: '2026-04-15',
    });
  });

  it('el 15 de agosto paga la 2ª partida, sin cruzar el año', () => {
    expect(resolverPartida('2026-08-15', PARTIDAS)).toEqual({
      numero: 2,
      desde: '2026-04-16',
      hasta: '2026-08-15',
    });
  });

  it('el 15 de diciembre paga la 3ª partida', () => {
    expect(resolverPartida('2026-12-15', PARTIDAS)).toEqual({
      numero: 3,
      desde: '2026-08-16',
      hasta: '2026-12-15',
    });
  });

  it('una fecha del 17 de diciembre pertenece a la partida que se paga el AÑO SIGUIENTE', () => {
    expect(resolverPartida('2026-12-17', PARTIDAS)).toEqual({
      numero: 1,
      desde: '2026-12-16',
      hasta: '2027-04-15',
    });
  });

  it('el ciclo cubre el año completo: cada día del 2026 cae en exactamente una partida', () => {
    const MS_POR_DIA = 86_400_000;
    let t = Date.parse('2026-01-01T00:00:00Z');
    const fin = Date.parse('2026-12-31T00:00:00Z');
    let dias = 0;
    while (t <= fin) {
      const fecha = new Date(t).toISOString().slice(0, 10);
      expect(() => resolverPartida(fecha, PARTIDAS)).not.toThrow();
      dias += 1;
      t += MS_POR_DIA;
    }
    expect(dias).toBe(365);
  });

  it('rechaza una fecha mal formada en vez de adivinar', () => {
    expect(() => resolverPartida('15/04/2026', PARTIDAS)).toThrow(/YYYY-MM-DD/);
  });

  it('rechaza un ciclo con huecos en vez de calcular sobre una ventana inventada', () => {
    const incompleto: DefinicionPartida[] = [{ numero: 1, desde: '01-01', hasta: '06-30' }];
    expect(() => resolverPartida('2026-08-15', incompleto)).toThrow(/Ninguna partida/);
  });

  it('rechaza partidas que se solapan', () => {
    const solapadas: DefinicionPartida[] = [
      { numero: 1, desde: '01-01', hasta: '06-30' },
      { numero: 2, desde: '06-01', hasta: '12-31' },
    ];
    expect(() => resolverPartida('2026-06-15', solapadas)).toThrow(/se solapan/);
  });
});

const ventana = resolverPartida('2026-08-15', PARTIDAS);
const base = {
  divisor: '12',
  divisorGeneral: null,
  aguinaldoAcostumbrado: null,
  partida: ventana,
  ultimaPartida: 3,
  concepto: 'xiii_mes',
  baseLegal: 'Decreto 19 de 1973 Art. 4º',
} as const;

describe('calcularPartidaXiii — fórmula del Art. 4º', () => {
  it('divide entre 12 la suma de los salarios de la ventana', () => {
    // 4 quincenas de 1000 + 2 de 1500 = 7000 → 7000/12 = 583.333… → 583.33
    const r = calcularPartidaXiii({ ...base, salariosDelPeriodo: Money.of('7000') });
    expect(r.linea.monto.toFixed2()).toBe('583.33');
    expect(r.reglaAplicada).toBe('formula');
    expect(r.advertencias).toEqual([]);
  });

  it('la tasa de la traza es 1/12 cuando manda la fórmula', () => {
    const r = calcularPartidaXiii({ ...base, salariosDelPeriodo: Money.of('7200') });
    expect(r.linea.monto.toFixed2()).toBe('600.00');
    expect(r.linea.tasa.toPercentString()).toBe('8.3333%');
  });

  it('la base de la línea es la suma de la ventana, no la partida', () => {
    const r = calcularPartidaXiii({ ...base, salariosDelPeriodo: Money.of('7000') });
    expect(r.linea.base.toFixed2()).toBe('7000.00');
  });

  it('un colaborador que entró a mitad del período acumula menos, sin prorrateo aparte', () => {
    const completo = calcularPartidaXiii({ ...base, salariosDelPeriodo: Money.of('8000') });
    const parcial = calcularPartidaXiii({ ...base, salariosDelPeriodo: Money.of('2000') });
    expect(completo.linea.monto.toFixed2()).toBe('666.67');
    expect(parcial.linea.monto.toFixed2()).toBe('166.67');
  });

  it('sin salarios en la ventana la partida es cero y no revienta la tasa', () => {
    const r = calcularPartidaXiii({ ...base, salariosDelPeriodo: Money.ZERO });
    expect(r.linea.monto.toFixed2()).toBe('0.00');
    expect(r.linea.tasa.toPercentString()).toBe('8.3333%');
  });
});

describe('calcularPartidaXiii — Art. 3º: aguinaldo vs. 3ª partida', () => {
  const tercera = { ...base, partida: resolverPartida('2026-12-15', PARTIDAS) };

  it('paga el aguinaldo cuando es más favorable, y lo advierte', () => {
    const r = calcularPartidaXiii({
      ...tercera,
      salariosDelPeriodo: Money.of('7000'),
      aguinaldoAcostumbrado: Money.of('750'),
    });
    expect(r.linea.monto.toFixed2()).toBe('750.00');
    expect(r.reglaAplicada).toBe('aguinaldo');
    expect(r.advertencias).toHaveLength(1);
    expect(r.advertencias[0]).toMatch(/más favorable/);
  });

  it('mantiene la partida cuando el aguinaldo es menor', () => {
    const r = calcularPartidaXiii({
      ...tercera,
      salariosDelPeriodo: Money.of('7000'),
      aguinaldoAcostumbrado: Money.of('400'),
    });
    expect(r.linea.monto.toFixed2()).toBe('583.33');
    expect(r.reglaAplicada).toBe('formula');
    expect(r.advertencias).toEqual([]);
  });

  it('`porFormula` conserva lo que decía la fórmula aunque gane el aguinaldo', () => {
    const r = calcularPartidaXiii({
      ...tercera,
      salariosDelPeriodo: Money.of('7000'),
      aguinaldoAcostumbrado: Money.of('750'),
    });
    expect(r.porFormula.round(2).toFixed2()).toBe('583.33');
  });

  it('rechaza el aguinaldo en la 1ª y 2ª partida: se pagan completas e íntegras', () => {
    expect(() =>
      calcularPartidaXiii({
        ...base,
        salariosDelPeriodo: Money.of('7000'),
        aguinaldoAcostumbrado: Money.of('750'),
      }),
    ).toThrow(/solo compite con la 3ª partida/);
  });
});

describe('calcularPartidaXiii — Art. 5º: piso irrenunciable', () => {
  it('un convenio que empeora el XIII no se aplica, y queda advertido', () => {
    // Divisor 15 en vez de 12 = partida más chica = menos favorable.
    const r = calcularPartidaXiii({
      ...base,
      salariosDelPeriodo: Money.of('7200'),
      divisor: '15',
      divisorGeneral: '12',
    });
    expect(r.linea.monto.toFixed2()).toBe('600.00');
    expect(r.reglaAplicada).toBe('piso_general');
    expect(r.advertencias[0]).toMatch(/Art\. 5º/);
  });

  it('un convenio que mejora el XIII sí se aplica, sin advertencia', () => {
    const r = calcularPartidaXiii({
      ...base,
      salariosDelPeriodo: Money.of('7200'),
      divisor: '10',
      divisorGeneral: '12',
    });
    expect(r.linea.monto.toFixed2()).toBe('720.00');
    expect(r.reglaAplicada).toBe('formula');
    expect(r.advertencias).toEqual([]);
  });
});
