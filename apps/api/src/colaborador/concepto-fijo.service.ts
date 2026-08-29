import {
  Inject,
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull, or, gte, lte, sql } from 'drizzle-orm';
import { schema } from '@nomix/db';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';
import { withContext, type TenantTx } from '../db/tenant.js';
import { cargarCatalogo } from '../concepto/concepto.service.js';

interface Ctx {
  usuarioId: string;
  empresaId: string;
}

export interface CrearConceptoFijo {
  conceptoCodigo: string;
  monto?: string | undefined;
  cantidad?: string | undefined;
  vigenteDesde: string;
  vigenteHasta?: string | undefined;
  nota?: string | undefined;
}

/**
 * Conceptos fijos del colaborador (`ADR-021`).
 *
 * Lo que se repite período tras período —gastos de representación, dietas, un
 * descuento pactado— y que hasta ahora, en el mejor de los casos, había que
 * volver a teclear en cada quincena; en el caso de `colaborador.gasto_rep`, ni
 * siquiera eso: el dato estaba en la ficha y el cálculo lo ignoraba.
 */
@Injectable()
export class ConceptoFijoService {
  constructor(@Inject(DB) private readonly handle: DbHandle) {}

  async listar(ctx: Ctx, colaboradorId: string): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      await this.exigirColaborador(tx, colaboradorId);
      return tx
        .select()
        .from(schema.colaboradorConcepto)
        .where(eq(schema.colaboradorConcepto.colaboradorId, colaboradorId));
    });
  }

  async crear(ctx: Ctx, colaboradorId: string, dto: CrearConceptoFijo): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      await this.exigirColaborador(tx, colaboradorId);

      // La unidad la manda el CATÁLOGO, no la petición (ADR-002). Validarlo al
      // asignar y no al calcular evita que una ficha mal capturada reviente a
      // mitad de la planilla, cuando ya es tarde y el error parece del motor.
      const catalogo = await cargarCatalogo(tx, dto.vigenteDesde);
      // `catalogo.get` lanza un Error pelado ante un código desconocido, y Nest
      // lo traduce a un 500: "Internal server error" para lo que en realidad es
      // un dato mal escrito por quien llama. Se comprueba antes para devolver
      // un 400 con el mensaje útil que el catálogo ya sabe dar.
      if (!catalogo.tiene(dto.conceptoCodigo)) {
        throw new BadRequestException(
          `El concepto '${dto.conceptoCodigo}' no está en el catálogo vigente al ` +
            `${dto.vigenteDesde}. Revisa el código o siémbralo primero (ADR-002).`,
        );
      }
      const concepto = catalogo.get(dto.conceptoCodigo);
      if (concepto.unidad === 'monto' && dto.monto === undefined) {
        throw new ConflictException(`El concepto '${concepto.codigo}' se asigna por monto.`);
      }
      if (concepto.unidad !== 'monto' && dto.cantidad === undefined) {
        throw new ConflictException(
          `El concepto '${concepto.codigo}' se asigna por ${concepto.unidad}.`,
        );
      }
      if (dto.vigenteHasta !== undefined && dto.vigenteHasta < dto.vigenteDesde) {
        throw new ConflictException('La vigencia no puede terminar antes de empezar.');
      }

      try {
        const [f] = await tx
          .insert(schema.colaboradorConcepto)
          .values({
            empresaId: ctx.empresaId,
            colaboradorId,
            conceptoCodigo: dto.conceptoCodigo,
            monto: dto.monto ?? null,
            cantidad: dto.cantidad ?? null,
            vigenteDesde: dto.vigenteDesde,
            vigenteHasta: dto.vigenteHasta ?? null,
            nota: dto.nota ?? null,
            creadoPor: ctx.usuarioId,
          })
          .returning();
        return f;
      } catch (e) {
        // El índice parcial impide dos asignaciones ABIERTAS del mismo concepto:
        // la planilla materializaría las dos y duplicaría el monto sin avisar.
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('ux_colab_concepto_abierto')) {
          throw new ConflictException(
            `Ya hay una asignación vigente de '${dto.conceptoCodigo}' para este colaborador. ` +
              `Ciérrala con una fecha de fin antes de crear la nueva.`,
          );
        }
        throw e instanceof Error ? e : new Error(msg);
      }
    });
  }

  /**
   * Cierra la asignación en una fecha en vez de borrarla.
   *
   * Borrar reescribiría el pasado: las planillas ya calculadas se apoyan en que
   * ese concepto estaba vigente, y recalcular una de marzo tras un DELETE
   * daría un resultado distinto sin que nada explique por qué (`ADR-001`).
   */
  async cerrar(ctx: Ctx, colaboradorId: string, id: string, hasta: string): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const [f] = await tx
        .update(schema.colaboradorConcepto)
        .set({ vigenteHasta: hasta })
        .where(
          and(
            eq(schema.colaboradorConcepto.id, id),
            eq(schema.colaboradorConcepto.colaboradorId, colaboradorId),
          ),
        )
        .returning();
      if (!f) throw new NotFoundException('Asignación no encontrada');
      return f;
    });
  }

  private async exigirColaborador(tx: TenantTx, colaboradorId: string): Promise<void> {
    const [c] = await tx
      .select({ id: schema.colaborador.id })
      .from(schema.colaborador)
      .where(eq(schema.colaborador.id, colaboradorId));
    if (!c) throw new NotFoundException('Colaborador no encontrado');
  }
}

/**
 * Materializa los conceptos fijos vigentes como movimientos del período
 * (`ADR-021`).
 *
 * Se convierten en `movimiento` con `origen = 'ficha'` en vez de tratarse como
 * una rama aparte dentro del motor, y esa es la decisión que hace barato todo
 * lo demás: al ser movimientos normales heredan la matriz de incidencia, los
 * topes del Art. 161, las bases de ISR y la traza, sin una sola línea nueva en
 * el cálculo. Y como son movimientos, el operador puede ajustarlos o borrarlos
 * en ESTE período sin tocar la ficha — que es justo la mezcla de automático y
 * editable que se pidió.
 *
 * Se hace al CREAR la planilla, no al calcular: así aparecen en el panel de
 * movimientos y se pueden revisar antes de que produzcan una cifra.
 *
 * La vigencia se resuelve contra la fecha de fin del período, no contra hoy,
 * por la misma razón que todo lo demás en Nomix (`ADR-001`): reabrir una
 * planilla de marzo tiene que aplicar lo que estaba pactado en marzo.
 */
export async function materializarConceptosFijos(
  tx: TenantTx,
  empresaId: string,
  planillaId: string,
  fechaPeriodo: string,
  usuarioId: string,
): Promise<number> {
  const vigentes = await tx
    .select()
    .from(schema.colaboradorConcepto)
    .where(
      and(
        lte(schema.colaboradorConcepto.vigenteDesde, fechaPeriodo),
        or(
          isNull(schema.colaboradorConcepto.vigenteHasta),
          gte(schema.colaboradorConcepto.vigenteHasta, fechaPeriodo),
        ),
      ),
    );
  if (vigentes.length === 0) return 0;

  // Solo para quien sigue en planilla al cierre del período: un cesante puede
  // conservar la asignación en su historial y no debe reaparecer cobrando.
  const activos = await tx
    .select({ id: schema.colaborador.id })
    .from(schema.colaborador)
    .where(
      or(
        isNull(schema.colaborador.fechaTermino),
        gte(schema.colaborador.fechaTermino, fechaPeriodo),
      ),
    );
  const esActivo = new Set(activos.map((c) => c.id));

  const aInsertar = vigentes.filter((v) => esActivo.has(v.colaboradorId));
  if (aInsertar.length === 0) return 0;

  await tx.insert(schema.movimiento).values(
    aInsertar.map((v) => ({
      empresaId,
      planillaId,
      colaboradorId: v.colaboradorId,
      conceptoCodigo: v.conceptoCodigo,
      cantidad: v.cantidad,
      monto: v.monto,
      nota: v.nota ?? 'Concepto fijo de la ficha',
      origen: 'ficha',
      creadoPor: usuarioId,
    })),
  );
  return aInsertar.length;
}

/** Cuántos movimientos de este período vinieron de la ficha. Para declararlo en la UI. */
export async function contarDesdeFicha(tx: TenantTx, planillaId: string): Promise<number> {
  const filas = await tx.execute(sql`
    select count(*)::int as n from movimiento
    where planilla_id = ${planillaId} and origen = 'ficha'`);
  return (filas as unknown as ReadonlyArray<{ n: number }>)[0]?.n ?? 0;
}
