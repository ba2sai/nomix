-- Nomix — políticas Row-Level Security (ADR-011, seguridad-datos)
--
-- Se aplica DESPUÉS de las migraciones de Drizzle. drizzle-kit no genera RLS;
-- estas políticas se versionan a mano y se ejecutan en el mismo pipeline.
--
-- Modelo: cada petición ejecuta, dentro de su transacción,
--   SET LOCAL app.current_empresa_id = '<uuid de la empresa activa>';
-- y estas políticas filtran por ese valor. El rol nomix_app es NOBYPASSRLS
-- (ver docker/postgres/init/01-app-role.sql), así que no puede evadirlas.

ALTER TABLE empresa           ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_empresa   ENABLE ROW LEVEL SECURITY;
ALTER TABLE regla             ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepto          ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_saliente   ENABLE ROW LEVEL SECURITY;

-- La empresa activa de la sesión (uuid) o NULL si no se ha fijado.
CREATE OR REPLACE FUNCTION app_current_empresa() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_empresa_id', true), '')::uuid
$$;

-- empresa: solo la empresa activa.
CREATE POLICY empresa_aislada ON empresa
  USING (id = app_current_empresa());

-- reglas y conceptos: los generales del país (empresa_id IS NULL) más los de
-- la empresa activa. Así los overrides por convenio conviven con la base país.
CREATE POLICY regla_aislada ON regla
  USING (empresa_id IS NULL OR empresa_id = app_current_empresa());
CREATE POLICY concepto_aislado ON concepto
  USING (empresa_id IS NULL OR empresa_id = app_current_empresa());

-- eventos: solo los de la empresa activa.
CREATE POLICY evento_aislado ON evento_saliente
  USING (empresa_id = app_current_empresa());

-- membresías: se filtran en la capa de aplicación al resolver la sesión;
-- aquí se restringe a la empresa activa como defensa en profundidad.
CREATE POLICY usuario_empresa_aislada ON usuario_empresa
  USING (empresa_id = app_current_empresa());
