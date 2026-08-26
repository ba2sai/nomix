import { randomBytes } from 'node:crypto';
import type { Redis } from 'ioredis';

/** Datos de sesión guardados server-side. La empresa activa NUNCA la envía el cliente. */
export interface SesionData {
  usuarioId: string;
  /** null hasta que el usuario elige empresa (relevante en firma contable). */
  empresaActivaId: string | null;
  creadoEn: string;
}

const PREFIJO = 'sess:';

/**
 * Sesiones en Redis. El id de sesión es un token opaque aleatorio; el estado
 * (incluida la empresa activa) vive en el servidor, no en la cookie.
 */
export class SessionStore {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSegundos: number,
  ) {}

  async crear(data: SesionData): Promise<string> {
    const id = randomBytes(32).toString('hex');
    await this.redis.set(PREFIJO + id, JSON.stringify(data), 'EX', this.ttlSegundos);
    return id;
  }

  async obtener(id: string): Promise<SesionData | null> {
    const raw = await this.redis.get(PREFIJO + id);
    return raw ? (JSON.parse(raw) as SesionData) : null;
  }

  /** Actualiza y renueva el TTL (sliding expiration). */
  async actualizar(id: string, data: SesionData): Promise<void> {
    await this.redis.set(PREFIJO + id, JSON.stringify(data), 'EX', this.ttlSegundos);
  }

  async destruir(id: string): Promise<void> {
    await this.redis.del(PREFIJO + id);
  }
}
