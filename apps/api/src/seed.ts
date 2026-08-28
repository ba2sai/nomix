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
import { sembrarConceptos } from './seed-conceptos.js';

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

  // Membresías vigentes en ambas empresas (roles distintos).
  //
  // La PK es (usuario_id, empresa_id, vigente_desde), así que un `current_date`
  // aquí NO es idempotente: correr el seed en un día distinto crea una fila
  // nueva en vez de chocar con el ON CONFLICT, duplicando la membresía activa
  // (mis_empresas() la lista dos veces). El WHERE NOT EXISTS evita insertar si
  // YA hay una membresía activa (vigente_hasta is null), sin importar la fecha.
  await db.execute(sql`
    insert into usuario_empresa (usuario_id, empresa_id, rol, vigente_desde, vigente_hasta)
    select ${USUARIO}, ${EMPRESA_A}, 'admin_rrhh', current_date, null
    where not exists (
      select 1 from usuario_empresa
      where usuario_id = ${USUARIO} and empresa_id = ${EMPRESA_A} and vigente_hasta is null
    )`);
  await db.execute(sql`
    insert into usuario_empresa (usuario_id, empresa_id, rol, vigente_desde, vigente_hasta)
    select ${USUARIO}, ${EMPRESA_B}, 'contador_auditor', current_date, null
    where not exists (
      select 1 from usuario_empresa
      where usuario_id = ${USUARIO} and empresa_id = ${EMPRESA_B} and vigente_hasta is null
    )`);

  // Tarifa de Riesgos Profesionales por empresa (Empresa A: oficina 1.05%)
  await db.execute(sql`update empresa set tasa_riesgo_profesional = 0.0105 where id = ${EMPRESA_A}`);

  // Reglas de tasas, versionadas por fecha de vigencia (ADR-001). Globales del
  // país (empresa_id null). Sembradas desde 06_base_legal_panama.md §13.
  await db.execute(sql`delete from regla where empresa_id is null and codigo in
    ('css_obrero','css_patronal','seguro_educativo_obrero','seguro_educativo_patronal')`);
  const tasa = (t: string) => sql`${JSON.stringify({ tasa: t })}::jsonb`;
  await db.execute(sql`
    insert into regla (jurisdiccion_id, empresa_id, codigo, valor, vigente_desde, vigente_hasta, base_legal, confianza) values
      ('PA', null, 'css_obrero',                ${tasa('0.0975')}, '2013-01-01', null,         'Ley 51 de 2005',  'verificado'),
      ('PA', null, 'seguro_educativo_obrero',   ${tasa('0.0125')}, '1987-01-01', null,         'Ley 13 de 1987',  'verificado'),
      ('PA', null, 'seguro_educativo_patronal', ${tasa('0.0150')}, '1987-01-01', null,         'Ley 13 de 1987',  'verificado'),
      ('PA', null, 'css_patronal',              ${tasa('0.1225')}, '2013-01-01', '2025-03-31', 'Ley 51 de 2005',  'verificado'),
      ('PA', null, 'css_patronal',              ${tasa('0.1325')}, '2025-04-01', '2027-02-28', 'Ley 462 de 2025', 'verificado'),
      ('PA', null, 'css_patronal',              ${tasa('0.1425')}, '2027-03-01', '2029-02-28', 'Ley 462 de 2025', 'verificado'),
      ('PA', null, 'css_patronal',              ${tasa('0.1525')}, '2029-03-01', null,         'Ley 462 de 2025', 'verificado')`);

  // Catálogo de conceptos + factores de recargo (ADR-002).
  await sembrarConceptos(db);

  // eslint-disable-next-line no-console
  console.log('✓ Seed: demo@nomix.pa / Demo1234, empresas A/B, reglas de tasas CSS/SE');
  await client.end();
}

void main();
