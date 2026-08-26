import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { schema } from '@nomix/db';
import { createDb, type DbHandle } from './client.js';
import { withTenant } from './tenant.js';

/**
 * Prueba de integración del aislamiento multi-inquilino a través de la capa de
 * aplicación (ADR-011). Requiere Postgres levantado con las tablas, el RLS y
 * dos empresas sembradas (A y B). Se ejecuta solo si DATABASE_URL apunta al
 * rol nomix_app (NOBYPASSRLS).
 *
 *   DATABASE_URL=postgresql://nomix_app:...@localhost:5432/nomix pnpm --filter @nomix/api test
 */
const DATABASE_URL = process.env['DATABASE_URL'];
const EMPRESA_A = '11111111-1111-1111-1111-111111111111';
const EMPRESA_B = '22222222-2222-2222-2222-222222222222';

describe.skipIf(!DATABASE_URL)('withTenant — aislamiento RLS por la capa de app', () => {
  let handle: DbHandle;

  beforeAll(() => {
    handle = createDb(DATABASE_URL!);
  });
  afterAll(async () => {
    await handle.close();
  });

  it('con empresa A activa, solo ve la empresa A', async () => {
    const filas = await withTenant(handle.db, EMPRESA_A, (tx) => tx.select().from(schema.empresa));
    expect(filas.map((e) => e.nombreComercial)).toEqual(['Empresa A']);
  });

  it('con empresa B activa, solo ve la empresa B', async () => {
    const filas = await withTenant(handle.db, EMPRESA_B, (tx) => tx.select().from(schema.empresa));
    expect(filas.map((e) => e.nombreComercial)).toEqual(['Empresa B']);
  });

  it('sin contexto de inquilino, no ve nada (deny-by-default)', async () => {
    const filas = await handle.db.select().from(schema.empresa);
    expect(filas).toEqual([]);
  });
});
