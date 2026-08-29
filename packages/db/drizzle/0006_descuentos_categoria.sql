-- Régimen del descuento frente a los topes del Art. 161 (ADR-004).
--
-- `pension_alimenticia` está EXENTA del tope global del 50%; `vivienda` tiene
-- su propio tope del 30% además del global; `ordinario` compite por la
-- capacidad del 50% por orden de prelación. NULL = no es un descuento de
-- acreedor (ingresos, aportes patronales, y las retenciones de ley, que la
-- base legal §9.1 lista como "sin límite").
ALTER TABLE "concepto" ADD COLUMN IF NOT EXISTS "categoria_descuento" text;
