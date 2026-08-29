-- Bitácora de acceso a datos sensibles (ADR-019).
--
-- Contrapartida de ADR-007: `salario_base` no se cifra, así que el control es
-- acceso restringido + rastro. ARCHITECTURE.md §5.3 la exige operativa antes
-- del primer dato real.
--
-- La inmutabilidad NO se declara aquí sino en rls.sql: la tabla recibe política
-- de INSERT y SELECT y ninguna de UPDATE/DELETE, y bajo RLS lo que no tiene
-- política se deniega. Por eso no hay trigger ni REVOKE: la ausencia de una
-- política ES el control.
CREATE TABLE IF NOT EXISTS "acceso_auditoria" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "empresa_id"  uuid NOT NULL,
  "usuario_id"  uuid NOT NULL,
  "rol"         text NOT NULL,
  "ocurrido_en" timestamptz NOT NULL DEFAULT now(),
  "accion"      text NOT NULL,
  "metodo"      text NOT NULL,
  "ruta"        text NOT NULL,
  "recurso_id"  text,
  "resultado"   text NOT NULL,
  "motivo"      text,
  "ip"          text
);

-- La consulta natural del auditor es "qué tocó esta empresa, del más reciente
-- hacia atrás", y la del investigador "qué hizo este usuario". Dos índices.
CREATE INDEX IF NOT EXISTS "ix_auditoria_empresa_fecha"
  ON "acceso_auditoria" ("empresa_id", "ocurrido_en" DESC);
CREATE INDEX IF NOT EXISTS "ix_auditoria_usuario_fecha"
  ON "acceso_auditoria" ("usuario_id", "ocurrido_en" DESC);
