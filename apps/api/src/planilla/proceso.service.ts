import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { and, eq, desc } from 'drizzle-orm';
import { schema } from '@nomix/db';
import {
  Money,
  Rate,
  acumularBases,
  baseCssGeneral,
  gruposCssEspeciales,
  calcularSeguridadSocial,
  calcularCssTasaEspecial,
  devengarSalarioBase,
  devengarHoras,
  devengarDias,
  type CatalogoConceptos,
  type LineaCalculada,
  type LineaDevengada,
  type ParametrosDevengo,
} from '@nomix/payroll-engine';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';
import { withContext, type TenantTx } from '../db/tenant.js';
import { resolverTasa } from '../rules/rule-resolver.js';
import { cargarCatalogo } from '../concepto/concepto.service.js';
import { resolverTasasSS } from './tasas.js';
import { resolverParametrosDevengo } from './devengo-params.js';
import { puedeTransicionar } from './estado.js';
import { calcularRetencionesIsr } from './isr-acumulado.js';

interface Ctx {
  usuarioId: string;
  empresaId: string;
}

type Movimiento = typeof schema.movimiento.$inferSelect;

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
          cantidad: l.cantidad,
          base: l.base,
          monto: l.monto,
        })),
      }));
      return { ...cab, colaboradores };
    });
  }

  /**
   * Recalcula (Zero-Recalculate): borra el detalle y lo recompone desde el
   * salario contratado, los movimientos del período y el catálogo de conceptos.
   *
   * El motor NO conoce conceptos por nombre: devenga cada línea, deja que
   * `acumularBases` decida en qué bases entra según la matriz de incidencia
   * (ADR-002), y aplica las tasas resueltas por la fecha del período (ADR-001).
   */
  async calcular(ctx: Ctx, id: string): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const cab = await this.cabecera(tx, id);
      if (!puedeTransicionar(cab.estado, 'calculada')) {
        throw new ConflictException(`No se puede recalcular una planilla en estado '${cab.estado}'`);
      }
      // Limpia el detalle previo (la traza cae en cascada).
      await tx.delete(schema.planillaDetalle).where(eq(schema.planillaDetalle.planillaId, id));

      const fecha = cab.periodoHasta;
      const catalogo = await cargarCatalogo(tx, fecha);
      const tasas = await resolverTasasSS(tx, fecha);
      const params = await resolverParametrosDevengo(tx, cab.tipo, fecha);
      const periodo = { desde: cab.periodoDesde, hasta: cab.periodoHasta };

      const colabs = await tx
        .select()
        .from(schema.colaborador)
        .where(eq(schema.colaborador.status, 'activo'));
      const movimientos = await tx
        .select()
        .from(schema.movimiento)
        .where(eq(schema.movimiento.planillaId, id));
      const movsPorColab = new Map<string, Movimiento[]>();
      for (const m of movimientos) {
        const arr = movsPorColab.get(m.colaboradorId) ?? [];
        arr.push(m);
        movsPorColab.set(m.colaboradorId, arr);
      }

      let totBruto = Money.ZERO;
      let totObrero = Money.ZERO;
      let totPatronal = Money.ZERO;
      let totIsr = Money.ZERO;
      const pendientes = new Set<string>();

      for (const c of colabs) {
        const salario = Money.of(c.salarioMensual);

        // 1. Devengar: salario prorrateado + movimientos del período. La
        //    cantidad de origen viaja con su línea para no perderse cuando un
        //    colaborador tiene varios movimientos del mismo concepto.
        const devengadas: Array<{ linea: LineaCalculada; cantidad: string | null }> = [
          { linea: devengarSalarioBase(salario, periodo, params), cantidad: null },
        ];
        for (const m of movsPorColab.get(c.id) ?? []) {
          devengadas.push({
            linea: await this.devengarMovimiento(tx, m, salario, catalogo, params, fecha),
            cantidad: m.cantidad,
          });
        }

        // 2. Acumular bases según la matriz de incidencia.
        const lineas: LineaDevengada[] = devengadas.map((d) => ({
          conceptoCodigo: d.linea.concepto,
          monto: d.linea.monto,
        }));
        const bases = acumularBases(lineas, catalogo);
        for (const p of bases.conceptosPendientes) pendientes.add(p);

        // 3. Aplicar las tasas de seguridad social sobre esas bases.
        const r = calcularSeguridadSocial(baseCssGeneral(bases), tasas, bases.seguroEducativo);
        const especiales = gruposCssEspeciales(bases).map((g) =>
          calcularCssTasaEspecial(
            'css_obrero_tasa_especial',
            g.base,
            g.tasaEspecial,
            'Decreto 19 de 1973; base legal §3.3 — régimen de tasa propia (ADR-002)',
          ),
        );

        // 3b. ISR — método acumulativo (ADR-014): recalcula el impuesto del
        // año a la fecha contra el histórico de este colaborador y retiene
        // solo la diferencia. Dos flujos paralelos porque el Formulario 03 los
        // exige separados (doc 09 §2).
        const isrLineas = await calcularRetencionesIsr(
          tx,
          c.id,
          id,
          fecha,
          bases.isr.ordinario,
          bases.isr.gastosRepresentacion,
        );

        // 4. Persistir: cada línea con su traza (ADR-005).
        for (const d of devengadas) {
          await this.persistir(tx, ctx, id, c.id, d.linea, catalogo, d.cantidad);
        }
        for (const l of [
          r.cssObrero,
          r.seObrero,
          ...especiales,
          ...isrLineas,
          r.cssPatronal,
          r.sePatronal,
          r.riesgosProfesionales,
        ]) {
          await this.persistir(tx, ctx, id, c.id, l, catalogo, null);
        }

        const brutoColab = devengadas.reduce((acc, d) => acc.plus(d.linea.monto), Money.ZERO);
        const isrColab = isrLineas.reduce((acc, l) => acc.plus(l.monto), Money.ZERO);
        const obreroColab = especiales.reduce((acc, l) => acc.plus(l.monto), r.totalObrero).plus(isrColab);
        totBruto = totBruto.plus(brutoColab);
        totObrero = totObrero.plus(obreroColab);
        totPatronal = totPatronal.plus(r.totalPatronal);
        totIsr = totIsr.plus(isrColab);
      }

      const totales = {
        colaboradores: colabs.length,
        bruto: totBruto.toFixed2(),
        deduccionesObrero: totObrero.toFixed2(),
        cargasPatronales: totPatronal.toFixed2(),
        // `totObrero` ya incluye el ISR retenido; el nombre histórico se
        // conserva con su significado literal (CSS+SE, sin ISR) para no
        // romper el contrato con `PlanillaPreview` (que no calcula ISR). El
        // neto real, con ISR ya descontado, es el campo `neto` de abajo.
        netoAntesIsr: totBruto.minus(totObrero.minus(totIsr)).toFixed2(),
        neto: totBruto.minus(totObrero).toFixed2(),
        costoEmpleador: totBruto.plus(totPatronal).toFixed2(),
        prorrateo: params.metodo,
        // Honestidad sobre el estado de la investigación legal: qué conceptos
        // participaron con una incidencia que todavía nadie confirmó.
        conceptosPendientes: [...pendientes].sort(),
        isr: {
          metodo: 'acumulativo',
          retenido: totIsr.toFixed2(),
          nota:
            'La ley no prescribe el método de retención quincenal (base legal §4.5, consulta A1). ' +
            'Nomix eligió el acumulativo (ADR-014): recalcula el impuesto del año a la fecha y ' +
            'retiene la diferencia contra lo ya retenido. No se restan CSS/SE de la base (la ' +
            'secuencia oficial de la DGI no lo indica) ni deducciones personales anuales (sin ' +
            'campo en la ficha del colaborador todavía).',
        },
      };
      const [p] = await tx
        .update(schema.planillaCabecera)
        .set({ estado: 'calculada', totales, calculadaEn: new Date() })
        .where(eq(schema.planillaCabecera.id, id))
        .returning();
      return p;
    });
  }

  /**
   * Convierte un movimiento en línea devengada según la UNIDAD que declara su
   * concepto: por horas (con el factor de recargo vigente), por días, o con el
   * monto capturado tal cual.
   */
  private async devengarMovimiento(
    tx: TenantTx,
    m: Movimiento,
    salario: Money,
    catalogo: CatalogoConceptos,
    params: ParametrosDevengo,
    fecha: string,
  ): Promise<LineaCalculada> {
    const concepto = catalogo.get(m.conceptoCodigo);
    if (concepto.unidad === 'horas') {
      if (m.cantidad === null) {
        throw new ConflictException(`El movimiento de '${concepto.codigo}' no trae horas.`);
      }
      // Convención: la regla del factor se llama `factor_<código del concepto>`.
      const factor = Rate.of(await resolverTasa(tx, `factor_${concepto.codigo}`, fecha));
      return devengarHoras(concepto.codigo, m.cantidad, salario, factor, params, concepto.baseLegal);
    }
    if (concepto.unidad === 'dias') {
      if (m.cantidad === null) {
        throw new ConflictException(`El movimiento de '${concepto.codigo}' no trae días.`);
      }
      return devengarDias(concepto.codigo, m.cantidad, salario, params, concepto.baseLegal);
    }
    if (m.monto === null) {
      throw new ConflictException(`El movimiento de '${concepto.codigo}' no trae monto.`);
    }
    return {
      concepto: concepto.codigo,
      base: Money.of(m.monto),
      tasa: Rate.of('1'),
      monto: Money.of(m.monto),
      baseLegal: concepto.baseLegal,
    };
  }

  /**
   * Escribe una línea de detalle y su traza. El `tipo` y el `articulo_legal`
   * salen del CATÁLOGO, no de constantes del motor: así la cita legal que ve el
   * auditor es la misma que declara la matriz de incidencia.
   *
   * `catalogo.get` lanza si el código no existe. Es deliberado: una línea sin
   * concepto sembrado es un error de configuración, no algo que se resuelva con
   * un valor por defecto.
   */
  private async persistir(
    tx: TenantTx,
    ctx: Ctx,
    planillaId: string,
    colaboradorId: string,
    linea: LineaCalculada,
    catalogo: CatalogoConceptos,
    cantidad: string | null,
  ): Promise<void> {
    const concepto = catalogo.get(linea.concepto);
    const [det] = await tx
      .insert(schema.planillaDetalle)
      .values({
        empresaId: ctx.empresaId,
        planillaId,
        colaboradorId,
        conceptoCodigo: linea.concepto,
        tipo: concepto.tipo,
        cantidad,
        base: linea.base.toString(),
        monto: linea.monto.toString(),
      })
      .returning();
    if (!det) throw new Error(`No se pudo persistir la línea '${linea.concepto}'.`);
    await tx.insert(schema.planillaTraza).values({
      empresaId: ctx.empresaId,
      detalleId: det.id,
      reglaCodigo: linea.concepto,
      baseAplicada: linea.base.toString(),
      tasaAplicada: linea.tasa.toPercentString(),
      resultado: linea.monto.toString(),
      articuloLegal: concepto.baseLegal,
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
