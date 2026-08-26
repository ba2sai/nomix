-- Nomix — rol de aplicación (ADR-011, seguridad-datos)
--
-- CRÍTICO: la app se conecta con un rol SIN BYPASSRLS. Las políticas
-- Row-Level Security solo se aplican a roles que no son superusuario ni
-- dueños de tabla con BYPASSRLS. Si la app usara el rol dueño, RLS no
-- filtraría nada y el aislamiento multi-inquilino sería ficticio.
--
-- El rol dueño (POSTGRES_USER) corre migraciones; nomix_app corre la app.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nomix_app') THEN
    CREATE ROLE nomix_app LOGIN PASSWORD 'cambia_esto' NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO nomix_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nomix_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO nomix_app;

-- citext para emails case-insensitive; pgcrypto por si se usa gen_random_uuid.
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
