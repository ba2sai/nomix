/**
 * Máquina de estados de la planilla (Factor WOW #1, "Zero-Recalculate").
 *
 * borrador → calculada → aprobada → cerrada. Se puede recalcular mientras no
 * esté aprobada; al cerrar queda inmutable.
 *
 * Vive en su propio módulo porque la consultan tanto el proceso de cálculo como
 * la captura de movimientos: una sola tabla de transiciones, no dos copias que
 * se desincronizan.
 */
export const TRANSICIONES: Record<string, readonly string[]> = {
  borrador: ['calculada'],
  calculada: ['calculada', 'aprobada'], // recalcular o aprobar
  aprobada: ['cerrada'],
  cerrada: [], // inmutable
};

export function puedeTransicionar(desde: string, hacia: string): boolean {
  return (TRANSICIONES[desde] ?? []).includes(hacia);
}

/**
 * ¿Se pueden modificar los insumos (movimientos) de la planilla?
 *
 * Solo mientras siga siendo recalculable: una vez aprobada, cambiar el
 * devengado produciría un detalle que ya no corresponde a lo que se aprobó.
 */
export function admiteCambioDeInsumos(estado: string): boolean {
  return puedeTransicionar(estado, 'calculada');
}
