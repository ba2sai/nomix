import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { schema } from '@nomix/db';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';
import { withContext, type TenantTx } from '../db/tenant.js';
import { cargarCatalogo } from '../concepto/concepto.service.js';
import { admiteCambioDeInsumos } from './estado.js';

interface Ctx {
  usuarioId: string;
  empresaId: string;
}

export interface CrearMovimientoDto {
  colaboradorId: string;
  conceptoCodigo: string;
  cantidad?: string | undefined;
  monto?: string | undefined;
  nota?: string | undefined;
}

/**
 * Captura del devengado variable del período: horas extra, comisiones,
 * ausencias, descuentos. Es el insumo que `ProcesoService.calcular` convierte
 * en líneas de planilla.
 */
@Injectable()
export class MovimientoService {
  constructor(@Inject(DB) private readonly handle: DbHandle) {}

  async listar(ctx: Ctx, planillaId: string): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      await this.cabeceraEditable(tx, planillaId, { soloLectura: true });
      return tx
        .select()
        .from(schema.movimiento)
        .where(eq(schema.movimiento.planillaId, planillaId));
    });
  }

  async crear(ctx: Ctx, planillaId: string, dto: CrearMovimientoDto): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const cab = await this.cabeceraEditable(tx, planillaId, { soloLectura: false });

      // El concepto tiene que existir en el catálogo vigente del período, y la
      // captura tiene que corresponder a su unidad. Validarlo aquí evita que un
      // movimiento inconsistente reviente a mitad del cálculo.
      const catalogo = await cargarCatalogo(tx, cab.periodoHasta);
      const concepto = catalogo.get(dto.conceptoCodigo);
      if (concepto.unidad === 'monto' && dto.monto === undefined) {
        throw new ConflictException(`El concepto '${concepto.codigo}' se captura por monto.`);
      }
      if (concepto.unidad !== 'monto' && dto.cantidad === undefined) {
        throw new ConflictException(
          `El concepto '${concepto.codigo}' se captura por ${concepto.unidad}.`,
        );
      }

      const [m] = await tx
        .insert(schema.movimiento)
        .values({
          empresaId: ctx.empresaId,
          planillaId,
          colaboradorId: dto.colaboradorId,
          conceptoCodigo: dto.conceptoCodigo,
          cantidad: dto.cantidad ?? null,
          monto: dto.monto ?? null,
          nota: dto.nota ?? null,
          origen: 'manual',
          creadoPor: ctx.usuarioId,
        })
        .returning();
      return m;
    });
  }

  async eliminar(ctx: Ctx, planillaId: string, movimientoId: string): Promise<{ ok: true }> {
    return withContext(this.handle.db, ctx, async (tx) => {
      await this.cabeceraEditable(tx, planillaId, { soloLectura: false });
      const borrados = await tx
        .delete(schema.movimiento)
        .where(
          and(
            eq(schema.movimiento.id, movimientoId),
            eq(schema.movimiento.planillaId, planillaId),
          ),
        )
        .returning();
      if (borrados.length === 0) throw new NotFoundException('Movimiento no encontrado');
      return { ok: true };
    });
  }

  /** Carga la cabecera y, salvo en lectura, exige que admita cambios de insumos. */
  private async cabeceraEditable(
    tx: TenantTx,
    planillaId: string,
    opts: { soloLectura: boolean },
  ): Promise<typeof schema.planillaCabecera.$inferSelect> {
    const [cab] = await tx
      .select()
      .from(schema.planillaCabecera)
      .where(eq(schema.planillaCabecera.id, planillaId));
    if (!cab) throw new NotFoundException('Planilla no encontrada');
    if (!opts.soloLectura && !admiteCambioDeInsumos(cab.estado)) {
      throw new ConflictException(
        `No se pueden modificar los movimientos de una planilla en estado '${cab.estado}'`,
      );
    }
    return cab;
  }
}
