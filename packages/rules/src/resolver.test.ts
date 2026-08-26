import { describe, it, expect } from 'vitest';
import { ResolverEnMemoria, fechaISO, type VersionRegla } from './index.js';

/** El caso que motiva todo el ADR-001: la cuota patronal cambia con el tiempo. */
const cssPatronal: ReadonlyArray<VersionRegla<string>> = [
  {
    codigo: 'css_patronal',
    valor: '0.1225',
    vigenteDesde: fechaISO('2013-01-01'),
    vigenteHasta: fechaISO('2025-03-31'),
    conocidoDesde: '2013-01-01',
    baseLegal: 'Ley 51 de 2005',
    jurisdiccionId: 'PA',
    empresaId: null,
  },
  {
    codigo: 'css_patronal',
    valor: '0.1325',
    vigenteDesde: fechaISO('2025-04-01'),
    vigenteHasta: fechaISO('2027-02-28'),
    conocidoDesde: '2025-03-18',
    baseLegal: 'Ley 462 de 2025',
    jurisdiccionId: 'PA',
    empresaId: null,
  },
  {
    codigo: 'css_patronal',
    valor: '0.1425',
    vigenteDesde: fechaISO('2027-03-01'),
    vigenteHasta: fechaISO('2029-02-28'),
    conocidoDesde: '2025-03-18',
    baseLegal: 'Ley 462 de 2025',
    jurisdiccionId: 'PA',
    empresaId: null,
  },
];

describe('ResolverEnMemoria — la tasa se resuelve por la fecha del período', () => {
  const r = new ResolverEnMemoria(cssPatronal);

  it('una planilla de marzo 2025 usa 12.25%', () => {
    expect(r.resolver<string>('css_patronal', fechaISO('2025-03-15'), 'PA').valor).toBe('0.1225');
  });

  it('una planilla de junio 2026 usa 13.25%', () => {
    expect(r.resolver<string>('css_patronal', fechaISO('2026-06-15'), 'PA').valor).toBe('0.1325');
  });

  it('una planilla de abril 2027 usa 14.25% — regla futura ya cargada', () => {
    expect(r.resolver<string>('css_patronal', fechaISO('2027-04-15'), 'PA').valor).toBe('0.1425');
  });

  it('falla si no hay regla vigente en la fecha', () => {
    expect(() => r.resolver('css_patronal', fechaISO('2010-01-01'), 'PA')).toThrow(/Sin regla/);
  });
});
