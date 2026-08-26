import { z } from 'zod';

/**
 * Contratos compartidos (Zod). Un monto viaja como STRING entre capas, nunca
 * como number — coherente con Money/decimal.js (ADR-006).
 */

/** Cadena decimal: "1234.56". No admite notación científica ni number. */
export const montoStr = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Monto debe ser una cadena decimal, p. ej. "1234.56"');

export const tipoDocumento = z.enum(['cedula', 'pasaporte']);

export const tipoPlanilla = z.enum([
  'quincenal',
  'bisemanal',
  'quincenal_pago_hora',
  'mensual_1ra_qna',
  'mensual_2da_qna',
]);

export const rol = z.enum([
  'super_admin',
  'admin_rrhh',
  'operador_nomina',
  'supervisor',
  'contador_auditor',
  'colaborador',
]);
export type Rol = z.infer<typeof rol>;

export const jurisdiccion = z.literal('PA'); // única implementada (ADR-008)
