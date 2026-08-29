-- Modelo de roles del negocio (ADR-018, revisado).
--
-- Los cuatro roles provisionales se sustituyen por los cinco que define la
-- organización. Es una migración de DATOS y no de esquema, pero tiene que
-- existir igual: la matriz de autorización es fail-closed, así que una fila con
-- un rol que ya no está en la matriz deja a esa persona sin ningún permiso.
-- Sin este UPDATE, desplegar el cambio de matriz bloquea a todo el mundo.
--
-- Correspondencias:
--   admin_rrhh       -> AdminRRHH      (mismo papel)
--   operador_nomina  -> AsistRRHH      (captura y calcula, no aprueba)
--   contador_auditor -> AsistContable  (solo lectura de resultados + bitácora)
--   colaborador      -> se queda igual: nunca tuvo permisos (el portal del
--                       empleado no existe) y no hay a qué mapearlo sin
--                       concederle de golpe la nómina completa.
UPDATE "usuario_empresa" SET "rol" = 'AdminRRHH'     WHERE "rol" = 'admin_rrhh';
UPDATE "usuario_empresa" SET "rol" = 'AsistRRHH'     WHERE "rol" = 'operador_nomina';
UPDATE "usuario_empresa" SET "rol" = 'AsistContable' WHERE "rol" = 'contador_auditor';
