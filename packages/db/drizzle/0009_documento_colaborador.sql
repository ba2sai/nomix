-- Documentos del colaborador (ADR-022): contratos, cédula, certificaciones.
--
-- La fila describe el archivo; el archivo vive en disco. No va en `bytea`
-- porque un contrato escaneado por colaborador infla la base y con ella cada
-- respaldo y cada restauración PITR (ADR-012), que es justo la operación que
-- uno quiere rápida y predecible el día que hace falta.
--
-- El `id` ES el nombre del archivo en disco. El nombre que subió el usuario se
-- guarda solo para mostrarlo: usarlo como ruta invita a `../../etc/passwd` y a
-- que dos "contrato.pdf" se pisen.
CREATE TABLE IF NOT EXISTS "documento_colaborador" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "empresa_id"     uuid NOT NULL,
  "colaborador_id" uuid NOT NULL REFERENCES "colaborador"("id") ON DELETE CASCADE,
  "tipo"           text NOT NULL,
  "nombre"         text NOT NULL,
  "mime"           text NOT NULL,
  "tamano"         text NOT NULL,
  "hash"           text NOT NULL,
  "creado_en"      timestamptz NOT NULL DEFAULT now(),
  "creado_por"     uuid
);

CREATE INDEX IF NOT EXISTS "ix_documento_colaborador"
  ON "documento_colaborador" ("colaborador_id", "creado_en" DESC);
