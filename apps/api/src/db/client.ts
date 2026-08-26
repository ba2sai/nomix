import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { schema } from '@nomix/db';

export type Db = PostgresJsDatabase<typeof schema>;

export interface DbHandle {
  readonly sql: postgres.Sql;
  readonly db: Db;
  close(): Promise<void>;
}

/**
 * Crea el pool de conexión. La URL apunta al rol `nomix_app`, que es
 * NOBYPASSRLS: las políticas Row-Level Security se le aplican siempre (ADR-011).
 * Nunca conectar la app con el rol dueño.
 */
export function createDb(databaseUrl: string): DbHandle {
  const sql = postgres(databaseUrl, { max: 10 });
  const db = drizzle(sql, { schema });
  return {
    sql,
    db,
    close: () => sql.end({ timeout: 5 }),
  };
}
