import { sql } from 'drizzle-orm';
import type { Db } from './client.js';

/** Transacción de Drizzle con el contexto de inquilino ya fijado. */
export type TenantTx = Parameters<Parameters<Db['transaction']>[0]>[0];

/**
 * Ejecuta `fn` dentro de una transacción con la empresa activa fijada.
 *
 * Este es el enganche de aplicación del aislamiento multi-inquilino (ADR-011):
 * abre una transacción, hace `set_config('app.current_empresa_id', ..., true)`
 * —`true` = local a la transacción, equivale a SET LOCAL— y corre las consultas
 * ahí dentro. Las políticas RLS filtran por ese valor. Como el rol es
 * NOBYPASSRLS, un inquilino nunca alcanza los datos de otro, ni por un bug de
 * la capa de aplicación.
 *
 * Regla: TODA consulta con datos de empresa pasa por aquí. Nunca se usa `db`
 * directamente para leer/escribir datos de inquilino.
 */
export async function withTenant<T>(
  db: Db,
  empresaId: string,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_empresa_id', ${empresaId}, true)`);
    return fn(tx);
  });
}
