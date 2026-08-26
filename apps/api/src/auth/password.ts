import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Hash de contraseñas con scrypt (node:crypto), sin dependencias nativas.
 * Formato almacenado: `scrypt$<saltHex>$<hashHex>`.
 *
 * scrypt es un KDF resistente a hardware. Para volumen alto conviene mover el
 * cómputo fuera del event loop; a la escala del MVP el sync es aceptable.
 */
const SALT_BYTES = 16;
const KEY_LEN = 64;

export function hashPassword(plano: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(plano, salt, KEY_LEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(plano: string, almacenado: string): boolean {
  const partes = almacenado.split('$');
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;
  const salt = Buffer.from(partes[1]!, 'hex');
  const esperado = Buffer.from(partes[2]!, 'hex');
  const actual = scryptSync(plano, salt, esperado.length);
  // Comparación en tiempo constante para no filtrar información por timing.
  return actual.length === esperado.length && timingSafeEqual(actual, esperado);
}
