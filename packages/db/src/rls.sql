-- Nomix — políticas Row-Level Security (ADR-011, seguridad-datos)
--
-- Idempotente: se puede re-aplicar. Se ejecuta DESPUÉS de las migraciones.
-- drizzle-kit no genera RLS; estas políticas se versionan a mano.
--
-- Dos ejes de contexto de sesión, fijados por la app en cada transacción:
--   app.current_empresa_id  -> la empresa activa (aislamiento de inquilino)
--   app.current_usuario_id  -> el usuario autenticado (para leer SUS membresías
--                              antes de elegir empresa, en el login)
-- El rol nomix_app es NOBYPASSRLS, así que no puede evadir estas políticas.

ALTER TABLE empresa           ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_empresa   ENABLE ROW LEVEL SECURITY;
ALTER TABLE regla             ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepto          ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_saliente   ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaborador       ENABLE ROW LEVEL SECURITY;
ALTER TABLE planilla_cabecera ENABLE ROW LEVEL SECURITY;
ALTER TABLE planilla_detalle  ENABLE ROW LEVEL SECURITY;
ALTER TABLE planilla_traza    ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimiento        ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_current_empresa() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_empresa_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_current_usuario() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_usuario_id', true), '')::uuid
$$;

-- empresa: solo la empresa activa.
DROP POLICY IF EXISTS empresa_aislada ON empresa;
CREATE POLICY empresa_aislada ON empresa
  USING (id = app_current_empresa());

-- reglas y conceptos: los generales del país (empresa_id IS NULL) más los de
-- la empresa activa.
DROP POLICY IF EXISTS regla_aislada ON regla;
CREATE POLICY regla_aislada ON regla
  USING (empresa_id IS NULL OR empresa_id = app_current_empresa());
DROP POLICY IF EXISTS concepto_aislado ON concepto;
CREATE POLICY concepto_aislado ON concepto
  USING (empresa_id IS NULL OR empresa_id = app_current_empresa());

-- eventos: solo los de la empresa activa.
DROP POLICY IF EXISTS evento_aislado ON evento_saliente;
CREATE POLICY evento_aislado ON evento_saliente
  USING (empresa_id = app_current_empresa());

-- colaboradores: solo los de la empresa activa. WITH CHECK explícito para que
-- un INSERT/UPDATE no pueda asignar el registro a otra empresa.
DROP POLICY IF EXISTS colaborador_aislado ON colaborador;
CREATE POLICY colaborador_aislado ON colaborador
  USING (empresa_id = app_current_empresa())
  WITH CHECK (empresa_id = app_current_empresa());

-- planilla y sus líneas: aislamiento directo por empresa activa.
DROP POLICY IF EXISTS planilla_cabecera_aislada ON planilla_cabecera;
CREATE POLICY planilla_cabecera_aislada ON planilla_cabecera
  USING (empresa_id = app_current_empresa())
  WITH CHECK (empresa_id = app_current_empresa());
DROP POLICY IF EXISTS planilla_detalle_aislado ON planilla_detalle;
CREATE POLICY planilla_detalle_aislado ON planilla_detalle
  USING (empresa_id = app_current_empresa())
  WITH CHECK (empresa_id = app_current_empresa());
DROP POLICY IF EXISTS planilla_traza_aislada ON planilla_traza;
CREATE POLICY planilla_traza_aislada ON planilla_traza
  USING (empresa_id = app_current_empresa())
  WITH CHECK (empresa_id = app_current_empresa());
DROP POLICY IF EXISTS movimiento_aislado ON movimiento;
CREATE POLICY movimiento_aislado ON movimiento
  USING (empresa_id = app_current_empresa())
  WITH CHECK (empresa_id = app_current_empresa());

-- membresías: un usuario ve las SUYAS (para el login, antes de elegir empresa),
-- y dentro de una empresa activa se ven las de esa empresa. Cubre ambos flujos.
DROP POLICY IF EXISTS usuario_empresa_aislada ON usuario_empresa;
CREATE POLICY usuario_empresa_aislada ON usuario_empresa
  USING (usuario_id = app_current_usuario() OR empresa_id = app_current_empresa());

-- Listado de empresas del usuario para el selector de login. Cruza inquilinos
-- (una firma contable ve varias empresas) por lo que NO puede pasar por el RLS
-- de `empresa`, que exige empresa activa. SECURITY DEFINER corre como el dueño
-- (bypass RLS) pero la consulta se acota estrictamente a app_current_usuario():
-- solo devuelve las membresías vigentes del propio usuario autenticado.
CREATE OR REPLACE FUNCTION mis_empresas()
  RETURNS TABLE(empresa_id uuid, nombre_comercial text, rol text)
  LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT e.id, e.nombre_comercial, ue.rol
    FROM usuario_empresa ue
    JOIN empresa e ON e.id = ue.empresa_id
    WHERE ue.usuario_id = app_current_usuario()
      AND ue.vigente_desde <= current_date
      AND (ue.vigente_hasta IS NULL OR ue.vigente_hasta >= current_date)
  $$;

GRANT EXECUTE ON FUNCTION mis_empresas() TO nomix_app;
