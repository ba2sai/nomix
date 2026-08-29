import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { schema } from '@nomix/db';
import { createDb, type DbHandle } from './client.js';
import { withContext, withTenant } from './tenant.js';

/**
 * Prueba de integración del aislamiento multi-inquilino a través de la capa de
 * aplicación (ADR-011). Requiere Postgres levantado con las tablas, el RLS y
 * dos empresas sembradas (A y B). Se ejecuta solo si DATABASE_URL apunta al
 * rol nomix_app (NOBYPASSRLS).
 *
 *   DATABASE_URL=postgresql://nomix_app:...@localhost:5432/nomix pnpm --filter @nomix/api test
 *
 * Desde ADR-018 el contexto lleva SIEMPRE los dos ejes (usuario + empresa):
 * `app_current_empresa()` solo reconoce la empresa activa si el usuario tiene
 * membresía vigente en ella, así que un contexto de solo-empresa ya no ve
 * nada. La revocación de acceso se prueba aparte, en `membresia.test.ts`.
 */
const DATABASE_URL = process.env['DATABASE_URL'];
const USUARIO = '99999999-9999-9999-9999-999999999999';
const EMPRESA_A = '11111111-1111-1111-1111-111111111111';
const EMPRESA_B = '22222222-2222-2222-2222-222222222222';

const enA = { usuarioId: USUARIO, empresaId: EMPRESA_A };
const enB = { usuarioId: USUARIO, empresaId: EMPRESA_B };

describe.skipIf(!DATABASE_URL)('withContext — aislamiento RLS por la capa de app', () => {
  let handle: DbHandle;

  beforeAll(() => {
    handle = createDb(DATABASE_URL!);
  });
  afterAll(async () => {
    await handle.close();
  });

  it('con empresa A activa, solo ve la empresa A', async () => {
    const filas = await withContext(handle.db, enA, (tx) => tx.select().from(schema.empresa));
    expect(filas.map((e) => e.nombreComercial)).toEqual(['Empresa A']);
  });

  it('con empresa B activa, solo ve la empresa B', async () => {
    const filas = await withContext(handle.db, enB, (tx) => tx.select().from(schema.empresa));
    expect(filas.map((e) => e.nombreComercial)).toEqual(['Empresa B']);
  });

  it('sin contexto alguno, no ve nada (deny-by-default)', async () => {
    const filas = await handle.db.select().from(schema.empresa);
    expect(filas).toEqual([]);
  });

  /**
   * `withTenant` fija empresa pero no usuario. Antes de ADR-018 bastaba; ahora
   * no, y esta prueba lo fija por escrito para que el cambio no se lea como una
   * regresión: un acceso a datos de inquilino sin usuario atribuible no se
   * sirve. Es también lo que hace que la bitácora (ADR-019) signifique algo.
   */
  it('withTenant (sin usuario) ya no alcanza para ver datos de inquilino', async () => {
    const filas = await withTenant(handle.db, EMPRESA_A, (tx) => tx.select().from(schema.empresa));
    expect(filas).toEqual([]);
  });

  /**
   * Los movimientos llevan el devengado del período: horas de un empleado
   * concreto y sus descuentos. Es de las tablas más sensibles del sistema, así
   * que su aislamiento se prueba igual que el de las demás (ARCHITECTURE §5.4).
   */
  describe('movimiento', () => {
    it('con empresa A activa, no ve movimientos de la empresa B', async () => {
      const filas = await withContext(handle.db, enA, (tx) => tx.select().from(schema.movimiento));
      expect(filas.every((m) => m.empresaId === EMPRESA_A)).toBe(true);
    });

    it('sin contexto de inquilino, no ve ningún movimiento', async () => {
      const filas = await handle.db.select().from(schema.movimiento);
      expect(filas).toEqual([]);
    });

    it('el WITH CHECK impide sembrar un movimiento en otra empresa', async () => {
      await expect(
        withContext(handle.db, enA, (tx) =>
          tx.insert(schema.movimiento).values({
            empresaId: EMPRESA_B, // ← intento de fuga de inquilino
            planillaId: '00000000-0000-0000-0000-000000000001',
            colaboradorId: '00000000-0000-0000-0000-000000000002',
            conceptoCodigo: 'extra_diurna',
            cantidad: '1',
            origen: 'manual',
          }),
        ),
      ).rejects.toThrow();
    });
  });
});
