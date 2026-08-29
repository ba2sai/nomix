import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { schema } from '@nomix/db';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';
import { withContext, type TenantTx } from '../db/tenant.js';
import { cargarCatalogo } from '../concepto/concepto.service.js';
import { TIPO_PLANILLA_XIII } from './decimo.js';
import { calcularVacacionesColaborador } from './vacaciones.js';
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
      // El XIII no tiene insumos capturables: su base se reconstruye de lo ya
      // percibido en la ventana de la partida. Aceptar un movimiento aquí y
      // luego ignorarlo al calcular sería peor que rechazarlo.
      if (cab.tipo === TIPO_PLANILLA_XIII) {
        throw new ConflictException(
          'Una planilla de XIII Mes no admite movimientos: su base sale de las planillas ' +
            'del período de la partida, no de captura manual.',
        );
      }

      // El concepto tiene que existir en el catálogo vigente del período, y la
      // captura tiene que corresponder a su unidad. Validarlo aquí evita que un
      // movimiento inconsistente reviente a mitad del cálculo.
      const catalogo = await cargarCatalogo(tx, cab.periodoHasta);
      // Un código desconocido es un error de QUIEN LLAMA, no del servidor: sin
      // esta comprobación el Error del catálogo sale como 500 y el operador ve
      // "Internal server error" en vez de qué concepto escribió mal.
      if (!catalogo.tiene(dto.conceptoCodigo)) {
        throw new BadRequestException(
          `El concepto '${dto.conceptoCodigo}' no está en el catálogo vigente al ` +
            `${cab.periodoHasta}. Revisa el código (ADR-002).`,
        );
      }
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

  /**
   * Ayuda de cálculo para el pago de vacaciones (ADR-016): reconstruye el
   * ciclo vigente del colaborador desde su histórico y sugiere un monto para
   * el movimiento `vacaciones_pagadas`. Solo lee — no crea ni modifica nada;
   * quien captura decide si usa el sugerido, lo ajusta o lo descarta.
   */
  async calcularVacaciones(ctx: Ctx, planillaId: string, colaboradorId: string): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const cab = await this.cabeceraEditable(tx, planillaId, { soloLectura: true });
      const catalogo = await cargarCatalogo(tx, cab.periodoHasta);
      return calcularVacacionesColaborador(tx, colaboradorId, cab.periodoHasta, planillaId, catalogo);
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
