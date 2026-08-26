/**
 * Resolución temporal de reglas (ADR-001).
 *
 * Toda tasa, tramo, divisor y umbral es un dato con período de validez. El
 * motor las resuelve por la FECHA DEL PERÍODO que se calcula, nunca por la
 * fecha actual: recalcular una planilla de 2024 debe usar las tasas de 2024.
 *
 * Bitemporalidad: `vigenteDesde/vigenteHasta` = cuándo la ley aplica.
 * `conocidoDesde` = cuándo Nomix se enteró (para responder a un auditor
 * "¿por qué en marzo calculamos esto?").
 */

/** Fecha civil sin hora, en formato ISO 'YYYY-MM-DD'. */
export type FechaISO = string & { readonly __brand: 'FechaISO' };

export function fechaISO(v: string): FechaISO {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new TypeError(`Fecha inválida: ${v}. Se espera 'YYYY-MM-DD'.`);
  }
  return v as FechaISO;
}

export interface VersionRegla<TValor> {
  readonly codigo: string;
  readonly valor: TValor;
  readonly vigenteDesde: FechaISO;
  readonly vigenteHasta: FechaISO | null;
  readonly conocidoDesde: string;
  readonly baseLegal: string;
  readonly jurisdiccionId: string;
  /** null = regla general del país; poblado = override por empresa (convenio). */
  readonly empresaId: string | null;
}

export interface ResolverReglas {
  /**
   * Devuelve la versión vigente de `codigo` en `fechaPeriodo`, prefiriendo el
   * override de `empresaId` sobre la regla general si existe.
   */
  resolver<TValor>(
    codigo: string,
    fechaPeriodo: FechaISO,
    jurisdiccionId: string,
    empresaId?: string | null,
  ): VersionRegla<TValor>;
}

/** Comparación lexicográfica válida para fechas ISO 'YYYY-MM-DD'. */
function vigenteEn(v: VersionRegla<unknown>, fecha: FechaISO): boolean {
  if (fecha < v.vigenteDesde) return false;
  if (v.vigenteHasta !== null && fecha > v.vigenteHasta) return false;
  return true;
}

/**
 * Resolver en memoria. Sirve para tests y para sembrar desde el YAML de la
 * base legal (docs/nomix/06 §13). La implementación de producción consulta la
 * tabla `regla` con el mismo contrato.
 */
export class ResolverEnMemoria implements ResolverReglas {
  constructor(private readonly versiones: ReadonlyArray<VersionRegla<unknown>>) {}

  resolver<TValor>(
    codigo: string,
    fechaPeriodo: FechaISO,
    jurisdiccionId: string,
    empresaId: string | null = null,
  ): VersionRegla<TValor> {
    const candidatas = this.versiones.filter(
      (v) =>
        v.codigo === codigo &&
        v.jurisdiccionId === jurisdiccionId &&
        (v.empresaId === null || v.empresaId === empresaId) &&
        vigenteEn(v, fechaPeriodo),
    );
    if (candidatas.length === 0) {
      throw new Error(
        `Sin regla '${codigo}' vigente en ${fechaPeriodo} (jurisdicción ${jurisdiccionId}).`,
      );
    }
    // El override por empresa gana sobre la regla general.
    const elegida =
      candidatas.find((v) => v.empresaId === empresaId && empresaId !== null) ?? candidatas[0]!;
    return elegida as VersionRegla<TValor>;
  }
}
