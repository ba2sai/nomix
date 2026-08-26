import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { FieldCrypto } from './field-crypto.js';

const clave = randomBytes(32).toString('base64');

describe('FieldCrypto (AES-256-GCM + índice ciego)', () => {
  const fc = new FieldCrypto(clave);

  it('cifra y descifra ida y vuelta', () => {
    const c = fc.cifrar('8-848-1493');
    expect(c).not.toContain('8-848-1493');
    expect(fc.descifrar(c)).toBe('8-848-1493');
  });

  it('produce ciphertext distinto por el IV aleatorio', () => {
    expect(fc.cifrar('8-848-1493')).not.toBe(fc.cifrar('8-848-1493'));
  });

  it('el índice ciego es determinista e ignora espacios/mayúsculas', () => {
    expect(fc.indiceCiego(' 8-848-1493 ')).toBe(fc.indiceCiego('8-848-1493'));
  });

  it('el descifrado falla si el ciphertext fue alterado (integridad GCM)', () => {
    const c = fc.cifrar('secreto');
    const roto = c.slice(0, -4) + 'AAAA';
    expect(() => fc.descifrar(roto)).toThrow();
  });

  it('rechaza una clave de tamaño incorrecto', () => {
    expect(() => new FieldCrypto('corta')).toThrow(/32 bytes/);
  });
});
