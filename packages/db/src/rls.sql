-- Nomix — políticas Row-Level Security (ADR-011, ADR-018, ADR-019)
--
-- Idempotente: se puede re-aplicar. Se ejecuta DESPUÉS de las migraciones.
-- drizzle-kit no genera RLS; estas políticas se versionan a mano.
--
-- Dos ejes de contexto de sesión, fijados por la app en cada transacción:
--   app.current_empresa_id  -> la empresa activa (aislamiento de inquilino)
--   app.current_usuario_id  -> el usuario autenticado
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
ALTER TABLE acceso_auditoria  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_current_usuario() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_usuario_id', true), '')::uuid
$$;

-- ---------------------------------------------------------------------------
-- Membresía vigente: el control que convierte "empresa elegida" en "empresa
-- AUTORIZADA" (ARCHITECTURE §5.4).
--
-- SECURITY DEFINER por dos razones, no por conveniencia:
--   1. `usuario_empresa` tiene RLS y su propia política llama a
--      app_current_empresa(); si esta función leyera la tabla bajo RLS habría
--      recursión de políticas.
--   2. La comprobación debe poder responder aunque el usuario ya NO tenga
--      derecho a ver la fila que lo excluye.
-- El search_path fijo es obligatorio en toda función SECURITY DEFINER: sin él,
-- un search_path manipulado puede resolver `usuario_empresa` a otra tabla.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_membresia_vigente(p_usuario uuid, p_empresa uuid)
  RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = pg_catalog, public AS $$
    SELECT EXISTS (
      SELECT 1 FROM usuario_empresa ue
      WHERE ue.usuario_id  = p_usuario
        AND ue.empresa_id  = p_empresa
        AND ue.vigente_desde <= current_date
        AND (ue.vigente_hasta IS NULL OR ue.vigente_hasta >= current_date)
    )
  $$;

-- Rol vigente del usuario en la empresa activa. Se resuelve en cada consulta,
-- nunca se copia a la sesión: degradar a alguien debe surtir efecto de
-- inmediato, no en su próximo login (ADR-018).
CREATE OR REPLACE FUNCTION app_rol_actual() RETURNS text
  LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = pg_catalog, public AS $$
    SELECT ue.rol
    FROM usuario_empresa ue
    WHERE ue.usuario_id = app_current_usuario()
      AND ue.empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::uuid
      AND ue.vigente_desde <= current_date
      AND (ue.vigente_hasta IS NULL OR ue.vigente_hasta >= current_date)
    ORDER BY ue.vigente_desde DESC
    LIMIT 1
  $$;

-- ---------------------------------------------------------------------------
-- app_current_empresa() NO es un simple lector del contexto: devuelve la
-- empresa activa SOLO si el usuario tiene membresía vigente en ella.
--
-- Centralizarlo aquí, en vez de repetir el AND en cada política, es lo que hace
-- que el control sea fail-closed por construcción: toda política existente —y
-- toda futura— que se aísle por app_current_empresa() hereda la comprobación
-- sin que nadie tenga que acordarse de añadirla.
--
-- Consecuencia deliberada: un contexto de solo-empresa (sin usuario) ya no ve
-- nada. Todo acceso a datos de inquilino queda atribuido a una persona, que es
-- justo lo que ADR-019 necesita para que la bitácora signifique algo. Un
-- proceso de fondo sin usuario interactivo (worker de PDF/ACH) necesitará su
-- propia decisión explícita; hoy no existe y no se le abre una puerta por si
-- acaso.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_empresa() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT ctx.emp
  FROM (
    SELECT NULLIF(current_setting('app.current_empresa_id', true), '')::uuid AS emp,
           NULLIF(current_setting('app.current_usuario_id', true), '')::uuid AS usr
  ) ctx
  WHERE ctx.emp IS NOT NULL
    AND ctx.usr IS NOT NULL
    AND app_membresia_vigente(ctx.usr, ctx.emp)
$$;

-- empresa: solo la empresa activa.
DROP POLICY IF EXISTS empresa_aislada ON empresa;
CREATE POLICY empresa_aislada ON empresa
  USING (id = app_current_empresa());

-- reglas y conceptos: los generales del país (empresa_id IS NULL) más los de
-- la empresa activa.
--
-- OJO con el NULL: `empresa_id IS NULL` deja ver las reglas del país aunque no
-- haya empresa activa, y eso es intencional (son públicas: tasas de CSS,
-- tramos de ISR). Ningún dato de inquilino se filtra por esta vía.
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

-- ---------------------------------------------------------------------------
-- Bitácora de acceso (ADR-019): append-only por ausencia de política.
--
-- SELECT: se lee dentro de la empresa activa.
-- INSERT: solo por registrar_acceso() más abajo, no directo desde la app.
-- UPDATE/DELETE: SIN POLÍTICA — y bajo RLS lo que no tiene política se deniega.
-- Nadie con el rol de la aplicación puede editar ni borrar su propio rastro,
-- aunque escriba el SQL a mano. Esa es toda la garantía de inmutabilidad, y no
-- depende de que la capa de aplicación se porte bien.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS auditoria_lectura ON acceso_auditoria;
CREATE POLICY auditoria_lectura ON acceso_auditoria
  FOR SELECT USING (empresa_id = app_current_empresa());

-- ---------------------------------------------------------------------------
-- El registro del acceso NO puede depender de que el acceso fuera permitido.
--
-- Si la membresía venció, app_current_empresa() devuelve NULL y cualquier
-- INSERT normal en la bitácora fallaría por WITH CHECK — perdiendo justo el
-- evento más interesante: el intento denegado. Por eso el asiento entra por una
-- función SECURITY DEFINER, que además fija ella misma el usuario desde el
-- contexto en vez de aceptarlo como parámetro: quien llama no puede firmar el
-- asiento con el nombre de otro.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION registrar_acceso(
  p_empresa    uuid,
  p_rol        text,
  p_accion     text,
  p_metodo     text,
  p_ruta       text,
  p_recurso_id text,
  p_resultado  text,
  p_motivo     text,
  p_ip         text
) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog, public AS $$
DECLARE
  v_usuario uuid := app_current_usuario();
BEGIN
  -- Sin usuario en contexto no hay a quién atribuir el acceso. Fallar ruidoso:
  -- una bitácora con asientos anónimos es peor que ninguna, porque aparenta
  -- cobertura que no tiene.
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'registrar_acceso sin app.current_usuario_id en contexto';
  END IF;
  IF p_resultado NOT IN ('permitido', 'denegado') THEN
    RAISE EXCEPTION 'resultado inválido: %', p_resultado;
  END IF;

  INSERT INTO acceso_auditoria
    (empresa_id, usuario_id, rol, accion, metodo, ruta, recurso_id, resultado, motivo, ip)
  VALUES
    (p_empresa, v_usuario, p_rol, p_accion, p_metodo, p_ruta, p_recurso_id, p_resultado, p_motivo, p_ip);
END;
$$;

-- Listado de empresas del usuario para el selector de login. Cruza inquilinos
-- (una firma contable ve varias empresas) por lo que NO puede pasar por el RLS
-- de `empresa`, que exige empresa activa. SECURITY DEFINER corre como el dueño
-- (bypass RLS) pero la consulta se acota estrictamente a app_current_usuario():
-- solo devuelve las membresías vigentes del propio usuario autenticado.
CREATE OR REPLACE FUNCTION mis_empresas()
  RETURNS TABLE(empresa_id uuid, nombre_comercial text, rol text)
  LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = pg_catalog, public AS $$
    SELECT e.id, e.nombre_comercial, ue.rol
    FROM usuario_empresa ue
    JOIN empresa e ON e.id = ue.empresa_id
    WHERE ue.usuario_id = app_current_usuario()
      AND ue.vigente_desde <= current_date
      AND (ue.vigente_hasta IS NULL OR ue.vigente_hasta >= current_date)
  $$;

GRANT EXECUTE ON FUNCTION mis_empresas()               TO nomix_app;
GRANT EXECUTE ON FUNCTION app_membresia_vigente(uuid, uuid) TO nomix_app;
GRANT EXECUTE ON FUNCTION app_rol_actual()             TO nomix_app;
GRANT EXECUTE ON FUNCTION registrar_acceso(uuid, text, text, text, text, text, text, text, text) TO nomix_app;
GRANT SELECT, INSERT ON acceso_auditoria TO nomix_app;

-- ---------------------------------------------------------------------------
-- Segundo control sobre la bitácora, independiente del RLS.
--
-- El RLS por sí solo ya la hace inmutable, pero de forma SILENCIOSA: sin
-- política de UPDATE, un `UPDATE acceso_auditoria ...` no lanza error, afecta
-- cero filas. Seguro, sí; detectable, no — y en una bitácora el intento de
-- manipulación es justo lo que uno quiere ver.
--
-- El REVOKE lo convierte en un "permission denied" inmediato y ruidoso. Los
-- dos controles se solapan a propósito: si alguien concede privilegios de más
-- con un GRANT ALL, el RLS sigue tapando el hueco; si alguien añade una
-- política por descuido, el REVOKE sigue en pie.
-- ---------------------------------------------------------------------------
REVOKE UPDATE, DELETE, TRUNCATE ON acceso_auditoria FROM nomix_app;
