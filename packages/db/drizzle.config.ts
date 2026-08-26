import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Las migraciones corren con el rol DUEÑO (no nomix_app), que sí puede
    // alterar tablas. La app en runtime usa nomix_app (NOBYPASSRLS).
    url: process.env.DATABASE_MIGRATE_URL ?? process.env.DATABASE_URL ?? '',
  },
});
