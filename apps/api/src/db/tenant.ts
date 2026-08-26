import { sql } from 'drizzle-orm';
import type { Db } from './client.js';

/** Transacción de Drizzle con el contexto de sesión ya fijado. */
export type TenantTx = Parameters<Parameters<Db['transaction']>[0]>[0];

export interface ContextoSesion {
  /** Usuario autenticado — habilita leer sus membresías (login). */
  usuarioId?: string;
  /** Empresa activa — activa el aislamiento de inquilino (RLS). */
  empresaId?: string;
}

/**
 * Ejecuta `fn` en una transacción con el contexto de sesión fijado (ADR-011).
 *
 * `set_config(..., true)` es local a la transacción (equivale a SET LOCAL). Las
 * políticas RLS leen `app.current_empresa_id` / `app.current_usuario_id` desde
 * ahí. Como el rol es NOBYPASSRLS, ningún bug de la capa de app puede saltarse
 * el aislamiento.
 */
export async function withContext<T>(
  db: Db,
  ctx: ContextoSesion,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    if (ctx.usuarioId !== undefined) {
      await tx.execute(sql`select set_config('app.current_usuario_id', ${ctx.usuarioId}, true)`);
    }
    if (ctx.empresaId !== undefined) {
      await tx.execute(sql`select set_config('app.current_empresa_id', ${ctx.empresaId}, true)`);
    }
    return fn(tx);
  });
}

/** Atajo: contexto de solo empresa activa (uso más común). */
export async function withTenant<T>(
  db: Db,
  empresaId: string,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return withContext(db, { empresaId }, fn);
}
