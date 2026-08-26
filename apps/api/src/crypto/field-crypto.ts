import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

/**
 * Cifrado de campo para PII (ADR-007).
 *
 * De una sola clave maestra (FIELD_ENCRYPTION_KEY, 32 bytes en base64) deriva
 * por HKDF dos subclaves independientes:
 *   - cifrado: AES-256-GCM con IV aleatorio → confidencialidad + integridad.
 *   - índice ciego: HMAC-SHA256 → permite unicidad y búsqueda por igualdad sin
 *     descifrar (el ciphertext es distinto en cada fila por el IV aleatorio, así
 *     que no serviría para un UNIQUE; el HMAC del valor normalizado sí).
 *
 * Formato cifrado: `v1.<iv b64>.<ciphertext b64>.<tag b64>`.
 */
export class FieldCrypto {
  private readonly encKey: Buffer;
  private readonly macKey: Buffer;

  constructor(masterBase64: string) {
    const master = Buffer.from(masterBase64, 'base64');
    if (master.length !== 32) {
      throw new Error('FIELD_ENCRYPTION_KEY debe ser 32 bytes en base64 (genera con: openssl rand -base64 32)');
    }
    const salt = Buffer.alloc(0);
    this.encKey = Buffer.from(hkdfSync('sha256', master, salt, 'nomix-field-enc', 32));
    this.macKey = Buffer.from(hkdfSync('sha256', master, salt, 'nomix-field-mac', 32));
  }

  cifrar(plano: string): string {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', this.encKey, iv);
    const ct = Buffer.concat([c.update(plano, 'utf8'), c.final()]);
    const tag = c.getAuthTag();
    return `v1.${iv.toString('base64')}.${ct.toString('base64')}.${tag.toString('base64')}`;
  }

  descifrar(almacenado: string): string {
    const partes = almacenado.split('.');
    if (partes.length !== 4 || partes[0] !== 'v1') {
      throw new Error('Formato de campo cifrado inválido');
    }
    const iv = Buffer.from(partes[1]!, 'base64');
    const ct = Buffer.from(partes[2]!, 'base64');
    const tag = Buffer.from(partes[3]!, 'base64');
    const d = createDecipheriv('aes-256-gcm', this.encKey, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
  }

  /** Índice ciego determinista para unicidad/búsqueda. Normaliza antes de hashear. */
  indiceCiego(plano: string): string {
    return createHmac('sha256', this.macKey).update(plano.trim().toUpperCase()).digest('base64');
  }
}
