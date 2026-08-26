import { z } from 'zod';

/**
 * Validación de entorno al arrancar. Si falta o es inválida una variable, la
 * API NO arranca — mejor fallar en el arranque que a mitad de un cálculo.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  // La app se conecta con el rol nomix_app (NOBYPASSRLS). Ver ADR-011.
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(8),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(28800),
  // Clave maestra de cifrado de PII (ADR-007). 32 bytes en base64 (44 chars).
  FIELD_ENCRYPTION_KEY: z.string().min(44),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuración de entorno inválida:\n${detalle}`);
  }
  return parsed.data;
}
