import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { schema } from '@nomix/db';
import { createDb, type DbHandle } from './client.js';
import { withContext } from './tenant.js';

/**
 * ARCHITECTURE §5.4 — la prueba de seguridad OBLIGATORIA, contra la base real.
 *
 *   "Un usuario cuya membresía en una empresa venció no puede acceder a sus
 *    datos, ni con una sesión previa ni manipulando identificadores."
 *
 * La parte difícil es "ni con una sesión previa". La sesión vive en Redis con
 * expiración deslizante y guarda `empresaActivaId`; si el aislamiento solo
 * comprobara ese identificador, una sesión abierta ANTES de la revocación
 * seguiría entrando mientras hubiera actividad — potencialmente para siempre.
 * Aquí se simula exactamente eso: se fija el mismo contexto que llevaría una
 * sesión vieja y se comprueba que la BASE DE DATOS, por su cuenta, ya no
 * devuelve nada (`app_current_empresa()` exige membresía vigente, `rls.sql`).
 *
 * Se prueba en la capa de datos a propósito: el guard de la aplicación también
 * lo impide, pero si la prueba pasara solo por el guard estaríamos verificando
 * la capa que un bug de aplicación puede saltarse, no la que no puede.
 *
 *   DATABASE_URL=postgresql://nomix_app:...@localhost:5432/nomix pnpm --filter @nomix/api test
 */
const DATABASE_URL = process.env['DATABASE_URL'];
const SEED_URL = process.env['SEED_DATABASE_URL'];
const USUARIO = '99999999-9999-9999-9999-999999999999';
const EMPRESA_A = '11111111-1111-1111-1111-111111111111';
const EMPRESA_B = '22222222-2222-2222-2222-222222222222';

describe.skipIf(!DATABASE_URL || !SEED_URL)('membresía vencida (ARCHITECTURE §5.4)', () => {
  let app: DbHandle; // rol nomix_app — NOBYPASSRLS, el que usa la API
  let dueno: DbHandle; // rol dueño — para mover la vigencia como lo haría un admin

  beforeAll(() => {
    app = createDb(DATABASE_URL!);
    dueno = createDb(SEED_URL!);
  });
  afterAll(async () => {
    await app.close();
    await dueno.close();
  });

  /** Deja la membresía como estaba: vigente y sin fecha de fin. */
  afterEach(async () => {
    await dueno.db.execute(sql`
      update usuario_empresa set vigente_hasta = null
      where usuario_id = ${USUARIO} and empresa_id = ${EMPRESA_A}`);
  });

  const vencerMembresia = async (): Promise<void> => {
    await dueno.db.execute(sql`
      update usuario_empresa set vigente_hasta = current_date - 1
      where usuario_id = ${USUARIO} and empresa_id = ${EMPRESA_A}`);
  };

  const ctx = { usuarioId: USUARIO, empresaId: EMPRESA_A };

  it('con membresía vigente ve a los colaboradores de su empresa', async () => {
    const filas = await withContext(app.db, ctx, (tx) => tx.select().from(schema.colaborador));
    expect(filas.length).toBeGreaterThan(0);
  });

  describe('una vez vencida', () => {
    it('la sesión previa deja de ver colaboradores — salarios incluidos', async () => {
      await vencerMembresia();
      const filas = await withContext(app.db, ctx, (tx) => tx.select().from(schema.colaborador));
      expect(filas).toEqual([]);
    });

    it('tampoco ve planillas, movimientos ni la empresa', async () => {
      await vencerMembresia();
      const [planillas, movimientos, empresas] = await withContext(app.db, ctx, async (tx) => [
        await tx.select().from(schema.planillaCabecera),
        await tx.select().from(schema.movimiento),
        await tx.select().from(schema.empresa),
      ]);
      expect(planillas).toEqual([]);
      expect(movimientos).toEqual([]);
      expect(empresas).toEqual([]);
    });

    it('no puede ESCRIBIR: el WITH CHECK rechaza el insert', async () => {
      await vencerMembresia();
      await expect(
        withContext(app.db, ctx, (tx) =>
          tx.insert(schema.movimiento).values({
            empresaId: EMPRESA_A,
            planillaId: '00000000-0000-0000-0000-000000000001',
            colaboradorId: '00000000-0000-0000-0000-000000000002',
            conceptoCodigo: 'extra_diurna',
            cantidad: '1',
            origen: 'manual',
          }),
        ),
      ).rejects.toThrow();
    });

    it('app_rol_actual() no devuelve rol, así que la app no puede autorizar nada', async () => {
      await vencerMembresia();
      const filas = await withContext(app.db, ctx, (tx) =>
        tx.execute(sql`select app_rol_actual() as rol`),
      );
      const r = (filas as unknown as ReadonlyArray<{ rol: string | null }>)[0];
      expect(r?.rol ?? null).toBeNull();
    });

    /**
     * "ni manipulando identificadores": vencida la membresía en A, apuntar el
     * contexto a B —donde el usuario SÍ sigue siendo miembro— no debe devolver
     * datos de A. Es el control de que el aislamiento sigue siendo por empresa
     * y no se relajó al añadir la comprobación de vigencia.
     */
    it('cambiar de empresa no arrastra datos de aquella de la que fue removido', async () => {
      await vencerMembresia();
      const filas = await withContext(
        app.db,
        { usuarioId: USUARIO, empresaId: EMPRESA_B },
        (tx) => tx.select().from(schema.colaborador),
      );
      expect(filas.every((c) => c.empresaId === EMPRESA_B)).toBe(true);
    });
  });

  /**
   * La comprobación de vigencia no debe haber abierto una puerta lateral: un
   * contexto SIN usuario (un bug que olvide fijar app.current_usuario_id) tiene
   * que seguir sin ver nada, no caer en un "no hay usuario, luego no compruebo".
   */
  it('sin usuario en contexto no se ve nada, aunque la empresa sea correcta', async () => {
    const filas = await withContext(app.db, { empresaId: EMPRESA_A }, (tx) =>
      tx.select().from(schema.colaborador),
    );
    expect(filas).toEqual([]);
  });
});

/**
 * La bitácora es evidencia: si se puede editar o borrar, no prueba nada
 * (ADR-019). Que sea inmutable no es una promesa de la capa de aplicación —
 * es la ausencia de políticas de UPDATE y DELETE en `rls.sql`.
 */
describe.skipIf(!DATABASE_URL)('bitácora de acceso — inmutable (ADR-019)', () => {
  let app: DbHandle;

  beforeAll(() => {
    app = createDb(DATABASE_URL!);
  });
  afterAll(async () => {
    await app.close();
  });

  const ctx = { usuarioId: USUARIO, empresaId: EMPRESA_A };

  it('registrar_acceso() deja el asiento y luego se puede leer', async () => {
    const antes = await withContext(app.db, ctx, (tx) =>
      tx.execute(sql`select count(*)::int as n from acceso_auditoria`),
    );
    await withContext(app.db, ctx, (tx) =>
      tx.execute(sql`
        select registrar_acceso(${EMPRESA_A}::uuid, 'admin_rrhh', 'colaborador:leer',
          'GET', '/api/colaboradores', null, 'permitido', null, '127.0.0.1')`),
    );
    const despues = await withContext(app.db, ctx, (tx) =>
      tx.execute(sql`select count(*)::int as n from acceso_auditoria`),
    );
    const n = (x: unknown): number => (x as ReadonlyArray<{ n: number }>)[0]!.n;
    expect(n(despues)).toBe(n(antes) + 1);
  });

  /**
   * El RLS por sí solo haría estas dos operaciones inocuas pero SILENCIOSAS:
   * sin política de UPDATE, Postgres no lanza error, simplemente no encuentra
   * filas que tocar. En una bitácora eso no basta —el intento de manipulación
   * es precisamente lo que hay que poder ver—, así que `rls.sql` añade un
   * REVOKE explícito. Estas pruebas exigen el fallo RUIDOSO, no solo la
   * ausencia de daño: si alguien quita el REVOKE confiando en que "el RLS ya
   * lo cubre", aquí se entera.
   */
  it('el rol de la aplicación NO puede modificar un asiento, y falla ruidoso', async () => {
    await expect(
      withContext(app.db, ctx, (tx) =>
        tx.execute(sql`update acceso_auditoria set resultado = 'permitido'`),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it('el rol de la aplicación NO puede borrar un asiento, y falla ruidoso', async () => {
    await expect(
      withContext(app.db, ctx, (tx) => tx.execute(sql`delete from acceso_auditoria`)),
    ).rejects.toThrow(/permission denied/i);
  });

  it('registrar_acceso() se niega a firmar un asiento sin usuario en contexto', async () => {
    await expect(
      withContext(app.db, { empresaId: EMPRESA_A }, (tx) =>
        tx.execute(sql`
          select registrar_acceso(${EMPRESA_A}::uuid, 'x', 'colaborador:leer',
            'GET', '/api/colaboradores', null, 'permitido', null, null)`),
      ),
    ).rejects.toThrow(/app.current_usuario_id/);
  });
});
