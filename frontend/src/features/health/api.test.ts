import { describe, expect, it } from 'vitest';
import { parseHealth } from './api';

describe('parseHealth', () => {
  it('acepta la respuesta del backend', () => {
    expect(parseHealth({ status: 'ok', service: 'nomix-api' })).toEqual({
      status: 'ok',
      service: 'nomix-api',
    });
  });

  it.each([
    ['nulo', null],
    ['texto', 'ok'],
    ['estado distinto', { status: 'down', service: 'nomix-api' }],
    ['sin servicio', { status: 'ok' }],
    ['servicio no textual', { status: 'ok', service: 1 }],
  ])('rechaza una respuesta %s', (_name, data) => {
    expect(() => parseHealth(data)).toThrow('Respuesta inesperada');
  });
});
