-- Identificación que exigen los reportes oficiales (SIPE y Formulario 03).
--
-- Dos datos que la ficha no tenía y que ningún reporte oficial puede omitir:
--
-- `seguro_social`: la CSS lo pide en columna propia, separado del documento.
-- Hoy en Panamá coincide con la cédula, pero no siempre fue así: en fichas
-- antiguas son números distintos. Modelarlo como columna aparte es lo que
-- permite cargar un histórico sin mentir. Es NULL cuando coincide con el
-- documento —que es el caso normal— para no obligar a teclear dos veces el
-- mismo número ni a mantener sincronizadas dos copias que pueden divergir.
-- Va cifrado por la misma razón que `id_cifrado` (ADR-007): es un
-- identificador nacional, y guardarlo en claro al lado de uno cifrado
-- anularía el cifrado del otro, porque hoy son el mismo número.
ALTER TABLE "colaborador"
  ADD COLUMN IF NOT EXISTS "seguro_social_cifrado" text;

-- `dv`: dígito verificador de la cédula. El Formulario 03 lo pide en columna
-- propia y como TEXTO — un DV de "05" no es 5, y convertirlo a número le come
-- el cero. En claro y no cifrado a propósito: por sí solo es un número de dos
-- dígitos que no identifica a nadie, y necesitarlo para exportar no debería
-- obligar a descifrar la cédula entera de toda la planilla.
-- El propio formulario manda dejarlo en blanco cuando el documento es
-- pasaporte, de ahí que sea NULL y no cadena vacía.
ALTER TABLE "colaborador"
  ADD COLUMN IF NOT EXISTS "dv" text;

COMMENT ON COLUMN "colaborador"."seguro_social_cifrado" IS
  'NULL = coincide con el documento de identidad. Poblado solo en el caso histórico en que difieren.';
COMMENT ON COLUMN "colaborador"."dv" IS
  'Dígito verificador de la cédula, como texto. NULL para pasaporte (Formulario 03, comentario de celda E4).';
