-- Aguinaldo o bonificación de Navidad acostumbrada, por colaborador.
--
-- Decreto 19 de 1973 Art. 3º: la 3ª partida del XIII Mes compite con el
-- aguinaldo pactado o acostumbrado de manera reiterada, y se paga la suma más
-- favorable al trabajador. `empresa.paga_aguinaldo_acostumbrado` (migración
-- 0000) enciende la regla; esta columna guarda el monto de cada quien.
-- NULL = este colaborador no tiene aguinaldo pactado.
ALTER TABLE "colaborador" ADD COLUMN IF NOT EXISTS "monto_aguinaldo" numeric(18, 6);
