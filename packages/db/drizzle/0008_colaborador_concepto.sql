-- Conceptos fijos del colaborador (ADR-021).
--
-- Lo recurrente deja de vivir como columnas sueltas en `colaborador` y pasa a
-- ser dato con vigencia: asignar un concepto es un INSERT, no una migración.
--
-- La vigencia no es adorno. Estas asignaciones caducan —un descuento se
-- termina de pagar, una dieta se aprueba por un semestre— y recalcular la
-- planilla de marzo tiene que resolverse con lo pactado en marzo (ADR-001).
CREATE TABLE IF NOT EXISTS "colaborador_concepto" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "empresa_id"      uuid NOT NULL,
  "colaborador_id"  uuid NOT NULL REFERENCES "colaborador"("id") ON DELETE CASCADE,
  "concepto_codigo" text NOT NULL,
  "monto"           numeric(18,6),
  "cantidad"        numeric(18,6),
  "vigente_desde"   date NOT NULL,
  "vigente_hasta"   date,
  "nota"            text,
  "creado_en"       timestamptz NOT NULL DEFAULT now(),
  "creado_por"      uuid
);

-- La consulta que corre en cada creación de planilla es "qué le toca a los
-- colaboradores de esta empresa en esta fecha".
CREATE INDEX IF NOT EXISTS "ix_colab_concepto_vigencia"
  ON "colaborador_concepto" ("colaborador_id", "vigente_desde", "vigente_hasta");

-- Un mismo concepto no puede tener dos asignaciones abiertas que se solapen en
-- el mismo día: la planilla no sabría cuál aplicar y materializaría las dos,
-- duplicando el monto en silencio. El índice parcial cubre el caso peligroso
-- —las que no tienen fecha de fin— y deja pasar el historial ya cerrado.
CREATE UNIQUE INDEX IF NOT EXISTS "ux_colab_concepto_abierto"
  ON "colaborador_concepto" ("colaborador_id", "concepto_codigo")
  WHERE "vigente_hasta" IS NULL;

-- `ficha` se suma al vocabulario de `movimiento.origen`: la línea la puso la
-- ficha del colaborador, no una persona tecleando. Se materializa como
-- movimiento —y no como una rama aparte en el motor— para que herede TODO lo
-- que ya sabe hacer la planilla: matriz de incidencia, topes del Art. 161,
-- bases de ISR y traza. Y como es un movimiento normal, el operador puede
-- ajustarlo o borrarlo en un período concreto sin tocar la ficha.
COMMENT ON COLUMN "movimiento"."origen" IS
  'manual | biometrico | importado | ficha (materializado desde colaborador_concepto, ADR-021)';
