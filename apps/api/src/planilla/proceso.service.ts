import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { and, eq, desc } from 'drizzle-orm';
import { schema } from '@nomix/db';
import { Money, calcularSeguridadSocial } from '@nomix/payroll-engine';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';
import { withContext, type TenantTx } from '../db/tenant.js';
import { resolverTasasSS } from './tasas.js';

interface Ctx {
  usuarioId: string;
  empresaId: string;
}

/** Transiciones válidas de la máquina de estados. */
const TRANSICIONES: Record<string, string[]> = {
  borrador: ['calculada'],
  calculada: ['calculada', 'aprobada'], // recalcular o aprobar
  aprobada: ['cerrada'],
  cerrada: [], // inmutable
};

function puedeTransicionar(desde: string, hacia: string): boolean {
  return (TRANSICIONES[desde] ?? []).includes(hacia);
}

@Injectable()
export class ProcesoService {
  constructor(@Inject(DB) private readonly handle: DbHandle) {}

  async crear(
    ctx: Ctx,
    dto: { tipo: string; periodoDesde: string; periodoHasta: string; fechaPago?: string | undefined },
  ): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const [p] = await tx
        .insert(schema.planillaCabecera)
        .values({
          empresaId: ctx.empresaId,
          tipo: dto.tipo,
          periodoDesde: dto.periodoDesde,
          periodoHasta: dto.periodoHasta,
          fechaPago: dto.fechaPago ?? null,
          estado: 'borrador',
        })
        .returning();
      return p;
    });
  }

  async listar(ctx: Ctx): Promise<unknown> {
    return withContext(this.handle.db, ctx, (tx) =>
      tx
        .select()
        .from(schema.planillaCabecera)
        .orderBy(desc(schema.planillaCabecera.periodoHasta)),
    );
  }

  async obtener(ctx: Ctx, id: string): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const cab = await this.cabecera(tx, id);
      const detalle = await tx
        .select()
        .from(schema.planillaDetalle)
        .where(eq(schema.planillaDetalle.planillaId, id));
      // Agrupa las líneas por colaborador para armar el desglose.
      const porColab = new Map<string, typeof detalle>();
      for (const d of detalle) {
        const arr = porColab.get(d.colaboradorId) ?? [];
        arr.push(d);
        porColab.set(d.colaboradorId, arr);
      }
      const colabIds = [...porColab.keys()];
      const nombres = colabIds.length
        ? await tx.select().from(schema.colaborador)
        : [];
      const nombreDe = new Map(nombres.map((c) => [c.id, `${c.nombres} ${c.apellidos}`]));
      const colaboradores = [...porColab.entries()].map(([cid, lineas]) => ({
        colaboradorId: cid,
        nombre: nombreDe.get(cid) ?? cid,
        lineas: lineas.map((l) => ({
          concepto: l.conceptoCodigo,
          tipo: l.tipo,
          base: l.base,
          monto: l.monto,
        })),
      }));
      return { ...cab, colaboradores };
    });
  }

  /** Recalcula (Zero-Recalculate): borra el detalle y lo recompone. */
  async calcular(ctx: Ctx, id: string): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const cab = await this.cabecera(tx, id);
      if (!puedeTransicionar(cab.estado, 'calculada')) {
        throw new ConflictException(`No se puede recalcular una planilla en estado '${cab.estado}'`);
      }
      // Limpia el detalle previo (la traza cae en cascada).
      await tx.delete(schema.planillaDetalle).where(eq(schema.planillaDetalle.planillaId, id));

      const tasas = await resolverTasasSS(tx, cab.periodoHasta);
      const colabs = await tx
        .select()
        .from(schema.colaborador)
        .where(eq(schema.colaborador.status, 'activo'));

      let totBruto = Money.ZERO;
      let totObrero = Money.ZERO;
      let totPatronal = Money.ZERO;

      for (const c of colabs) {
        const base = Money.of(c.salarioMensual);
        const r = calcularSeguridadSocial(base, tasas);
        totBruto = totBruto.plus(base);
        totObrero = totObrero.plus(r.totalObrero);
        totPatronal = totPatronal.plus(r.totalPatronal);

        // Línea de ingreso (salario base) + líneas calculadas con su traza.
        await tx.insert(schema.planillaDetalle).values({
          empresaId: ctx.empresaId,
          planillaId: id,
          colaboradorId: c.id,
          conceptoCodigo: 'salario',
          tipo: 'ingreso',
          base: base.toString(),
          monto: base.toString(),
        });
        for (const linea of [
          { l: r.cssObrero, tipo: 'deduccion' },
          { l: r.seObrero, tipo: 'deduccion' },
          { l: r.cssPatronal, tipo: 'aporte_patronal' },
          { l: r.sePatronal, tipo: 'aporte_patronal' },
          { l: r.riesgosProfesionales, tipo: 'aporte_patronal' },
        ]) {
          const [det] = await tx
            .insert(schema.planillaDetalle)
            .values({
              empresaId: ctx.empresaId,
              planillaId: id,
              colaboradorId: c.id,
              conceptoCodigo: linea.l.concepto,
              tipo: linea.tipo,
              base: linea.l.base.toString(),
              monto: linea.l.monto.toString(),
            })
            .returning();
          await tx.insert(schema.planillaTraza).values({
            empresaId: ctx.empresaId,
            detalleId: det!.id,
            reglaCodigo: linea.l.concepto,
            baseAplicada: linea.l.base.toString(),
            tasaAplicada: linea.l.tasa.toPercentString(),
            resultado: linea.l.monto.toString(),
            articuloLegal: linea.l.baseLegal,
          });
        }
      }

      const totales = {
        colaboradores: colabs.length,
        bruto: totBruto.toFixed2(),
        deduccionesObrero: totObrero.toFixed2(),
        cargasPatronales: totPatronal.toFixed2(),
        netoAntesIsr: totBruto.minus(totObrero).toFixed2(),
        costoEmpleador: totBruto.plus(totPatronal).toFixed2(),
      };
      const [p] = await tx
        .update(schema.planillaCabecera)
        .set({ estado: 'calculada', totales, calculadaEn: new Date() })
        .where(eq(schema.planillaCabecera.id, id))
        .returning();
      return p;
    });
  }

  async aprobar(ctx: Ctx, id: string): Promise<unknown> {
    return this.transicion(ctx, id, 'aprobada', {
      estado: 'aprobada',
      aprobadaEn: new Date(),
      aprobadaPor: ctx.usuarioId,
    });
  }

  /** Cierra la planilla (inmutable) y emite el evento de dominio (ADR-013). */
  async cerrar(ctx: Ctx, id: string): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const cab = await this.cabecera(tx, id);
      if (!puedeTransicionar(cab.estado, 'cerrada')) {
        throw new ConflictException(`No se puede cerrar una planilla en estado '${cab.estado}'`);
      }
      const [p] = await tx
        .update(schema.planillaCabecera)
        .set({ estado: 'cerrada', cerradaEn: new Date() })
        .where(eq(schema.planillaCabecera.id, id))
        .returning();
      await tx.insert(schema.eventoSaliente).values({
        empresaId: ctx.empresaId,
        tipo: 'PlanillaCerrada',
        payload: { planillaId: id, totales: cab.totales },
      });
      return p;
    });
  }

  private async transicion(
    ctx: Ctx,
    id: string,
    hacia: string,
    set: Partial<typeof schema.planillaCabecera.$inferInsert>,
  ): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const cab = await this.cabecera(tx, id);
      if (!puedeTransicionar(cab.estado, hacia)) {
        throw new ConflictException(`Transición inválida: ${cab.estado} → ${hacia}`);
      }
      const [p] = await tx
        .update(schema.planillaCabecera)
        .set(set)
        .where(eq(schema.planillaCabecera.id, id))
        .returning();
      return p;
    });
  }

  private async cabecera(tx: TenantTx, id: string): Promise<typeof schema.planillaCabecera.$inferSelect> {
    const [cab] = await tx
      .select()
      .from(schema.planillaCabecera)
      .where(and(eq(schema.planillaCabecera.id, id)));
    if (!cab) throw new NotFoundException('Planilla no encontrada');
    return cab;
  }
}
