/**
 * Siembra de desarrollo: un usuario demo con membresía vigente en dos empresas
 * (firma contable). Se conecta con el rol DUEÑO (bypass RLS) para poder insertar
 * membresías sin contexto de inquilino. NO usar en producción.
 *
 *   SEED_DATABASE_URL=postgresql://nomix:...@localhost:5432/nomix pnpm --filter @nomix/api seed
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { schema } from '@nomix/db';
import { hashPassword } from './auth/password.js';

const EMPRESA_A = '11111111-1111-1111-1111-111111111111';
const EMPRESA_B = '22222222-2222-2222-2222-222222222222';
const USUARIO = '99999999-9999-9999-9999-999999999999';

async function main(): Promise<void> {
  const url = process.env['SEED_DATABASE_URL'];
  if (!url) throw new Error('Falta SEED_DATABASE_URL (rol dueño para bypass RLS)');
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  // Empresas (por si no existen)
  await db.execute(sql`
    insert into empresa (id, nombre_comercial, razon_social) values
      (${EMPRESA_A}, 'Empresa A', 'A, S.A.'),
      (${EMPRESA_B}, 'Empresa B', 'B, S.A.')
    on conflict (id) do nothing`);

  // Usuario demo
  const hash = hashPassword('Demo1234');
  await db.execute(sql`
    insert into usuario (id, email, password_hash, nombre, activo) values
      (${USUARIO}, 'demo@nomix.pa', ${hash}, 'Usuario Demo', true)
    on conflict (id) do update set password_hash = excluded.password_hash`);

  // Membresías vigentes en ambas empresas (roles distintos)
  await db.execute(sql`
    insert into usuario_empresa (usuario_id, empresa_id, rol, vigente_desde, vigente_hasta) values
      (${USUARIO}, ${EMPRESA_A}, 'admin_rrhh',       current_date, null),
      (${USUARIO}, ${EMPRESA_B}, 'contador_auditor', current_date, null)
    on conflict do nothing`);

  // eslint-disable-next-line no-console
  console.log('✓ Seed: demo@nomix.pa / Demo1234 con membresía en Empresa A y B');
  await client.end();
}

void main();
