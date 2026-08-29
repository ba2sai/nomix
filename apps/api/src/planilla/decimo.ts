import { sql } from 'drizzle-orm';
import {
  Money,
  acumularBases,
  resolverPartida,
  type Bases,
  type CatalogoConceptos,
  type DefinicionPartida,
  type VentanaPartida,
} from '@nomix/payroll-engine';
import type { TenantTx } from '../db/tenant.js';
import { resolverLista, resolverTasa, resolverTasaGeneral } from '../rules/rule-resolver.js';

/**
 * Capa de datos del Décimo Tercer Mes. La mecánica legal vive en el motor
 * (`packages/payroll-engine/src/prestaciones/decimo.ts`); aquí solo se hace lo
 * que el motor puro no puede: resolver el ciclo de partidas desde `regla` y
 * releer del histórico lo que el trabajador percibió en la ventana.
 *
 * Ese "releer el histórico" es la decisión de fondo: la base del XIII NO se
 * guarda como un acumulado que se va sumando, se reconstruye sumando las líneas
 * de planilla ya persistidas. Es el mismo principio del ISR acumulativo
 * (ADR-014): recalcular una quincena anterior corrige el XIII solo, sin dejar
 * una cifra vieja desincronizada en ninguna parte.
 */

/** Tipo de planilla que dispara el proceso del XIII en vez del devengo ordinario. */
export const TIPO_PLANILLA_XIII = 'xiii';

export interface CicloXiii {
  readonly partidas: readonly DefinicionPartida[];
  /** Divisor efectivo: el de la empresa si sobrescribe, si no el del país. */
  readonly divisor: string;
  /** Divisor de la regla general, solo cuando la empresa la sobrescribe (Art. 5º). */
  readonly divisorGeneral: string | null;
  /** Número de la partida que compite con el aguinaldo (Art. 3º): la última. */
  readonly ultimaPartida: number;
}

interface FilaPartida {
  numero: unknown;
  desde: unknown;
  hasta: unknown;
}

function comoPartida(fila: unknown, indice: number): DefinicionPartida {
  const f = fila as FilaPartida;
  if (typeof f.numero !== 'number' || typeof f.desde !== 'string' || typeof f.hasta !== 'string') {
    throw new Error(
      `La regla 'partidas_xiii' tiene el elemento ${String(indice)} mal formado. ` +
        `Se espera { numero: number, desde: 'MM-DD', hasta: 'MM-DD' }.`,
    );
  }
  return { numero: f.numero, desde: f.desde, hasta: f.hasta };
}

/**
 * Resuelve por vigencia el ciclo de partidas y el divisor (ADR-001). Ni las
 * fechas ni el 12 están en el código: cambiarlos es un INSERT con nueva
 * vigencia, incluso si la ley lleva medio siglo sin moverlos.
 */
export async function resolverCicloXiii(tx: TenantTx, fecha: string): Promise<CicloXiii> {
  const [lista, divisor, divisorPais] = await Promise.all([
    resolverLista(tx, 'partidas_xiii', fecha),
    resolverTasa(tx, 'divisor_xiii', fecha),
    resolverTasaGeneral(tx, 'divisor_xiii', fecha),
  ]);
  const partidas = lista.map(comoPartida);
  const ultimaPartida = partidas.reduce((max, p) => Math.max(max, p.numero), 0);
  return {
    partidas,
    divisor,
    divisorGeneral: divisor === divisorPais ? null : divisorPais,
    ultimaPartida,
  };
}

/** La partida que corresponde pagar en `fecha`, con su ventana de acumulación. */
export function ventanaDePago(fecha: string, ciclo: CicloXiii): VentanaPartida {
  return resolverPartida(fecha, ciclo.partidas);
}

interface FilaAcumulada {
  colaborador_id: string;
  concepto_codigo: string;
  monto: string;
}

/**
 * Reconstruye, por colaborador, lo percibido dentro de la ventana de la partida.
 *
 * Devuelve las `Bases` completas y no solo el escalar del XIII porque quien
 * decide qué entra es la matriz de incidencia (ADR-002), no esta consulta: las
 * horas extra y las comisiones suman, una ausencia resta por ser `deduccion`, y
 * los gastos de representación quedan fuera sin que aquí se nombre ninguno.
 *
 * La planilla actual se excluye para que recalcular sea idempotente. Las
 * planillas de XIII anteriores no contaminan la ventana: el concepto `xiii_mes`
 * declara `incide_base_xiii = false`, así que el propio catálogo impide que el
 * décimo se calcule sobre el décimo.
 *
 * Una planilla se asigna ENTERA a la partida en la que TERMINA (`periodo_hasta`).
 * Los cortes del calendario panameño coinciden con los de las partidas —la
 * quincena que cierra el 15 de agosto es la última de la 2ª— así que en la
 * práctica ninguna planilla queda partida por la frontera. Si un tipo de
 * planilla futuro la cruzara (bisemanal desalineada), esta convención la
 * asignaría completa al lado de su cierre.
 */
export async function acumularVentana(
  tx: TenantTx,
  ventana: VentanaPartida,
  planillaIdActual: string,
  catalogo: CatalogoConceptos,
): Promise<ReadonlyMap<string, Bases>> {
  const filas = await tx.execute(sql`
    select
      d.colaborador_id,
      d.concepto_codigo,
      sum(d.monto)::text as monto
    from planilla_detalle d
    join planilla_cabecera c on c.id = d.planilla_id
    where c.periodo_hasta between ${ventana.desde}::date and ${ventana.hasta}::date
      and d.planilla_id <> ${planillaIdActual}
    group by d.colaborador_id, d.concepto_codigo
    order by d.colaborador_id
  `);

  const porColaborador = new Map<string, Array<{ conceptoCodigo: string; monto: Money }>>();
  for (const f of filas as unknown as readonly FilaAcumulada[]) {
    const arr = porColaborador.get(f.colaborador_id) ?? [];
    arr.push({ conceptoCodigo: f.concepto_codigo, monto: Money.of(f.monto) });
    porColaborador.set(f.colaborador_id, arr);
  }

  const bases = new Map<string, Bases>();
  for (const [colaboradorId, lineas] of porColaborador) {
    bases.set(colaboradorId, acumularBases(lineas, catalogo));
  }
  return bases;
}
