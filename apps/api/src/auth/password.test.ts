import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password (scrypt)', () => {
  it('verifica una contraseña correcta', () => {
    const h = hashPassword('Demo1234');
    expect(verifyPassword('Demo1234', h)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', () => {
    const h = hashPassword('Demo1234');
    expect(verifyPassword('otra', h)).toBe(false);
  });

  it('produce hashes distintos por el salt aleatorio', () => {
    expect(hashPassword('x')).not.toBe(hashPassword('x'));
  });

  it('rechaza un hash malformado sin lanzar', () => {
    expect(verifyPassword('x', 'basura')).toBe(false);
  });
});
