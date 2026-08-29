import { describe, it, expect } from 'vitest';
import { Money, Rate } from '../money.js';
import { asignarDescuentos, type DescuentoSolicitado } from './descuentos.js';

const topes = { global: Rate.of('0.50'), vivienda: Rate.of('0.30') };

function pedir(
  conceptoCodigo: string,
  categoria: DescuentoSolicitado['categoria'],
  monto: string,
  desde = '2026-01-01',
): DescuentoSolicitado {
  return { conceptoCodigo, categoria, montoSolicitado: Money.of(monto), desde };
}

const base = {
  salarioEnDinero: Money.of('1000'),
  montoInembargable: Money.ZERO,
  pisoSalarioMinimo: null,
  topes,
} as const;

describe('asignarDescuentos — tope global del 50% (Art. 161)', () => {
  it('aplica completo lo que cabe dentro del 50%', () => {
    const r = asignarDescuentos({ ...base, solicitados: [pedir('prestamo', 'ordinario', '300')] });
    expect(r.asignados[0]?.montoAplicado.toFixed2()).toBe('300.00');
    expect(r.asignados[0]?.razon).toBe('completo');
    expect(r.totalArrastrado.toFixed2()).toBe('0.00');
  });

  it('recorta al 50% y arrastra el resto en vez de descontar de más', () => {
    const r = asignarDescuentos({ ...base, solicitados: [pedir('prestamo', 'ordinario', '700')] });
    expect(r.asignados[0]?.montoAplicado.toFixed2()).toBe('500.00');
    expect(r.asignados[0]?.saldoArrastrado.toFixed2()).toBe('200.00');
    expect(r.asignados[0]?.razon).toBe('parcial_tope_global');
  });

  it('el segundo acreedor solo recibe lo que dejó el primero', () => {
    const r = asignarDescuentos({
      ...base,
      solicitados: [
        pedir('prestamo', 'ordinario', '400', '2026-01-01'),
        pedir('adelanto', 'ordinario', '300', '2026-02-01'),
      ],
    });
    expect(r.asignados[0]?.montoAplicado.toFixed2()).toBe('400.00');
    expect(r.asignados[1]?.montoAplicado.toFixed2()).toBe('100.00');
    expect(r.asignados[1]?.razon).toBe('parcial_tope_global');
    expect(r.totalAplicado.toFixed2()).toBe('500.00');
  });

  it('un acreedor sin capacidad restante queda en cero, no negativo', () => {
    const r = asignarDescuentos({
      ...base,
      solicitados: [
        pedir('prestamo', 'ordinario', '500', '2026-01-01'),
        pedir('adelanto', 'ordinario', '200', '2026-02-01'),
      ],
    });
    expect(r.asignados[1]?.montoAplicado.toFixed2()).toBe('0.00');
    expect(r.asignados[1]?.razon).toBe('sin_capacidad');
    expect(r.asignados[1]?.saldoArrastrado.toFixed2()).toBe('200.00');
  });
});

describe('asignarDescuentos — prelación por antigüedad de la orden (consulta E1)', () => {
  it('la orden más antigua cobra primero, sin importar el orden de entrada', () => {
    const r = asignarDescuentos({
      ...base,
      solicitados: [
        pedir('adelanto', 'ordinario', '400', '2026-06-01'),
        pedir('prestamo', 'ordinario', '400', '2026-01-01'),
      ],
    });
    expect(r.asignados[0]?.conceptoCodigo).toBe('prestamo');
    expect(r.asignados[0]?.montoAplicado.toFixed2()).toBe('400.00');
    expect(r.asignados[1]?.montoAplicado.toFixed2()).toBe('100.00');
  });

  it('dos órdenes del mismo día se ordenan por su marca de tiempo, no por código', () => {
    const r = asignarDescuentos({
      ...base,
      solicitados: [
        pedir('adelanto', 'ordinario', '400', '2026-01-15T18:00:00.000Z'),
        pedir('prestamo', 'ordinario', '400', '2026-01-15T09:00:00.000Z'),
      ],
    });
    expect(r.asignados[0]?.conceptoCodigo).toBe('prestamo');
    expect(r.asignados[0]?.montoAplicado.toFixed2()).toBe('400.00');
  });

  it('a igual marca de tiempo, el desempate por código es determinista', () => {
    const uno = asignarDescuentos({
      ...base,
      solicitados: [pedir('prestamo', 'ordinario', '400'), pedir('adelanto', 'ordinario', '400')],
    });
    const dos = asignarDescuentos({
      ...base,
      solicitados: [pedir('adelanto', 'ordinario', '400'), pedir('prestamo', 'ordinario', '400')],
    });
    expect(uno.asignados[0]?.conceptoCodigo).toBe('adelanto');
    expect(dos.asignados[0]?.conceptoCodigo).toBe('adelanto');
  });
});

describe('asignarDescuentos — pensión alimenticia exenta del tope', () => {
  it('se aplica completa aunque supere el 50%', () => {
    const r = asignarDescuentos({
      ...base,
      solicitados: [pedir('pension_alimenticia', 'pension_alimenticia', '700')],
    });
    expect(r.asignados[0]?.montoAplicado.toFixed2()).toBe('700.00');
    expect(r.asignados[0]?.razon).toBe('completo');
  });

  it('no consume la capacidad del 50% de los demás acreedores', () => {
    const r = asignarDescuentos({
      ...base,
      solicitados: [
        pedir('pension_alimenticia', 'pension_alimenticia', '400'),
        pedir('prestamo', 'ordinario', '500'),
      ],
    });
    expect(r.asignados[0]?.montoAplicado.toFixed2()).toBe('400.00');
    expect(r.asignados[1]?.montoAplicado.toFixed2()).toBe('500.00');
    expect(r.totalAplicado.toFixed2()).toBe('900.00');
  });
});

describe('asignarDescuentos — tope propio de vivienda (30%)', () => {
  it('recorta al 30% aunque el global tenga margen', () => {
    const r = asignarDescuentos({
      ...base,
      solicitados: [pedir('vivienda', 'vivienda', '450')],
    });
    expect(r.asignados[0]?.montoAplicado.toFixed2()).toBe('300.00');
    expect(r.asignados[0]?.razon).toBe('parcial_tope_vivienda');
  });

  it('vivienda sí consume la capacidad global del 50%', () => {
    const r = asignarDescuentos({
      ...base,
      solicitados: [
        pedir('vivienda', 'vivienda', '300', '2026-01-01'),
        pedir('prestamo', 'ordinario', '300', '2026-02-01'),
      ],
    });
    expect(r.asignados[0]?.montoAplicado.toFixed2()).toBe('300.00');
    expect(r.asignados[1]?.montoAplicado.toFixed2()).toBe('200.00');
    expect(r.totalAplicado.toFixed2()).toBe('500.00');
  });
});

describe('asignarDescuentos — inembargabilidad en cuantía completa (Art. 161)', () => {
  it('sobre un pago íntegramente inembargable no se asigna ningún descuento', () => {
    const r = asignarDescuentos({
      ...base,
      salarioEnDinero: Money.of('1000'),
      montoInembargable: Money.of('1000'),
      solicitados: [pedir('prestamo', 'ordinario', '200')],
    });
    expect(r.asignados[0]?.montoAplicado.toFixed2()).toBe('0.00');
    expect(r.asignados[0]?.razon).toBe('excluido_inembargable');
    expect(r.baseEmbargable.toFixed2()).toBe('0.00');
  });

  it('la porción inembargable reduce la base del tope, no solo el neto', () => {
    // 1000 de los cuales 600 son vacaciones → base embargable 400 → tope 200.
    const r = asignarDescuentos({
      ...base,
      montoInembargable: Money.of('600'),
      solicitados: [pedir('prestamo', 'ordinario', '400')],
    });
    expect(r.baseEmbargable.toFixed2()).toBe('400.00');
    expect(r.capacidadGlobal.toFixed2()).toBe('200.00');
    expect(r.asignados[0]?.montoAplicado.toFixed2()).toBe('200.00');
  });

  it('lo advierte en vez de recortar en silencio', () => {
    const r = asignarDescuentos({
      ...base,
      montoInembargable: Money.of('600'),
      solicitados: [pedir('prestamo', 'ordinario', '400')],
    });
    expect(r.advertencias.some((a) => a.includes('inembargables en cuantía completa'))).toBe(true);
  });
});

describe('asignarDescuentos — piso de salario mínimo (Art. 161)', () => {
  it('declara que no lo verificó cuando no hay tabla de salario mínimo', () => {
    const r = asignarDescuentos({ ...base, solicitados: [pedir('prestamo', 'ordinario', '100')] });
    expect(r.advertencias.some((a) => a.includes('No se verificó el piso de salario mínimo'))).toBe(true);
  });

  it('advierte cuando el neto queda bajo el mínimo aplicable', () => {
    const r = asignarDescuentos({
      ...base,
      pisoSalarioMinimo: Money.of('600'),
      solicitados: [pedir('prestamo', 'ordinario', '500')],
    });
    expect(r.advertencias.some((a) => a.includes('por debajo del'))).toBe(true);
  });

  it('no advierte cuando el neto respeta el mínimo', () => {
    const r = asignarDescuentos({
      ...base,
      pisoSalarioMinimo: Money.of('400'),
      solicitados: [pedir('prestamo', 'ordinario', '500')],
    });
    expect(r.advertencias.some((a) => a.includes('por debajo del'))).toBe(false);
  });
});
