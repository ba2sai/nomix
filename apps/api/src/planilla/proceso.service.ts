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
  calcularPartidaXiii,
  asignarDescuentos,
  type DescuentoSolicitado,
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
import {
  TIPO_PLANILLA_XIII,
  acumularVentana,
  resolverCicloXiii,
  ventanaDePago,
} from './decimo.js';
import { resolverTopesDescuento } from './descuentos.js';
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
      /**
       * Cada línea viaja con SU traza (ADR-005). El rastro ya se persistía;
       * lo que faltaba era servirlo, y sin él la cifra de la pantalla es un
       * número que hay que creerse. Con él, la UI puede responder "¿por qué
       * 63.65?" citando regla, base, tasa y artículo — que es justo lo que un
       * auditor de la CSS pregunta.
       *
       * LEFT JOIN y no INNER: una línea sin traza es un defecto que hay que
       * poder VER en la pantalla, no una fila que desaparece del desglose y
       * descuadra el total sin explicación.
       */
      const detalle = await tx
        .select({
          d: schema.planillaDetalle,
          t: schema.planillaTraza,
        })
        .from(schema.planillaDetalle)
        .leftJoin(schema.planillaTraza, eq(schema.planillaTraza.detalleId, schema.planillaDetalle.id))
        .where(eq(schema.planillaDetalle.planillaId, id));
      // Agrupa las líneas por colaborador para armar el desglose.
      const porColab = new Map<string, typeof detalle>();
      for (const fila of detalle) {
        const arr = porColab.get(fila.d.colaboradorId) ?? [];
        arr.push(fila);
        porColab.set(fila.d.colaboradorId, arr);
      }
      const colabIds = [...porColab.keys()];
      const nombres = colabIds.length
        ? await tx.select().from(schema.colaborador)
        : [];
      const nombreDe = new Map(nombres.map((c) => [c.id, `${c.nombres} ${c.apellidos}`]));
      const colaboradores = [...porColab.entries()].map(([cid, lineas]) => ({
        colaboradorId: cid,
        nombre: nombreDe.get(cid) ?? cid,
        lineas: lineas.map(({ d, t }) => ({
          concepto: d.conceptoCodigo,
          tipo: d.tipo,
          cantidad: d.cantidad,
          base: d.base,
          monto: d.monto,
          // `null` significa "esta línea se calculó sin dejar rastro", y la UI
          // lo dice con esas palabras en vez de fingir que no falta nada.
          traza: t
            ? {
                reglaCodigo: t.reglaCodigo,
                baseAplicada: t.baseAplicada,
                tasaAplicada: t.tasaAplicada,
                resultado: t.resultado,
                articuloLegal: t.articuloLegal,
                calculadoEn: t.calculadoEn,
              }
            : null,
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

      // El XIII no se devenga: se reconstruye de lo ya percibido en la ventana
      // de su partida. Es otro proceso, no otro concepto — por eso la rama está
      // en el TIPO de planilla y no dentro del bucle de conceptos (ADR-002).
      if (cab.tipo === TIPO_PLANILLA_XIII) {
        return this.calcularPartidaDecimo(tx, ctx, cab, catalogo);
      }

      const tasas = await resolverTasasSS(tx, fecha);
      const params = await resolverParametrosDevengo(tx, cab.tipo, fecha);
      const topes = await resolverTopesDescuento(tx, fecha);
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
      let totDescuentos = Money.ZERO;
      let totArrastrado = Money.ZERO;
      const pendientes = new Set<string>();
      // Los hallazgos del Art. 161 se deduplican: "no se verificó el piso de
      // salario mínimo" es el mismo hecho para toda la planilla, no uno por
      // colaborador.
      const advertencias = new Set<string>();

      for (const c of colabs) {
        const salario = Money.of(c.salarioMensual);

        // 1. Devengar: salario prorrateado + movimientos del período. La
        //    cantidad de origen viaja con su línea para no perderse cuando un
        //    colaborador tiene varios movimientos del mismo concepto.
        //
        //    Los descuentos de ACREEDOR se apartan aquí: no se devengan y se
        //    persisten como el resto, porque su monto final no lo decide quien
        //    los capturó sino los topes del Art. 161 (ADR-004). Cuál es de
        //    acreedor lo dice el catálogo (`categoria_descuento`), no el código.
        const movimientos = movsPorColab.get(c.id) ?? [];
        const solicitudes: DescuentoSolicitado[] = [];
        const devengadas: Array<{ linea: LineaCalculada; cantidad: string | null }> = [
          { linea: devengarSalarioBase(salario, periodo, params), cantidad: null },
        ];
        for (const m of movimientos) {
          const linea = await this.devengarMovimiento(tx, m, salario, catalogo, params, fecha);
          const categoria = catalogo.get(m.conceptoCodigo).categoriaDescuento;
          if (categoria === null) {
            devengadas.push({ linea, cantidad: m.cantidad });
          } else {
            solicitudes.push({
              conceptoCodigo: m.conceptoCodigo,
              categoria,
              montoSolicitado: linea.monto,
              // Prelación por antigüedad de la orden (consulta E1 abierta): a
              // falta de una fecha de orden en el modelo, la captura del
              // movimiento es lo más cercano y es auditable. Se usa la marca
              // completa, no solo la fecha: dos capturas del mismo día tienen
              // un orden real, y de él depende quién cobra si el 50% no alcanza.
              desde: m.creadoEn.toISOString(),
            });
          }
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

        // 3c. Descuentos de acreedor — asignación con restricciones (ADR-004).
        // El tope del 50% se mide sobre el devengado en dinero, del que se
        // aparta lo inembargable en cuantía completa (vacaciones,
        // indemnizaciones — Art. 161). Qué es inembargable lo declara el
        // catálogo, no este método.
        const bruto = devengadas.reduce(
          (acc, d) => (catalogo.get(d.linea.concepto).tipo === 'ingreso' ? acc.plus(d.linea.monto) : acc),
          Money.ZERO,
        );
        const inembargable = devengadas.reduce((acc, d) => {
          const co = catalogo.get(d.linea.concepto);
          return co.tipo === 'ingreso' && co.esInembargable ? acc.plus(d.linea.monto) : acc;
        }, Money.ZERO);
        const asignacion = asignarDescuentos({
          salarioEnDinero: bruto,
          montoInembargable: inembargable,
          // La tabla de 59 tasas del D.E. 13 de 2025 no está cargada todavía,
          // así que el piso del Art. 161 no se verifica y el motor lo declara.
          pisoSalarioMinimo: null,
          topes,
          solicitados: solicitudes,
        });
        for (const a of asignacion.advertencias) advertencias.add(a);

        // 4. Persistir: cada línea con su traza (ADR-005).
        for (const d of devengadas) {
          await this.persistir(tx, ctx, id, c.id, d.linea, catalogo, d.cantidad);
        }
        // Los descuentos van con el monto ASIGNADO, no el solicitado, y su
        // traza guarda por qué quedó así.
        for (const a of asignacion.asignados) {
          if (a.montoAplicado.isZero()) continue;
          await this.persistir(
            tx,
            ctx,
            id,
            c.id,
            {
              concepto: a.conceptoCodigo,
              base: bruto,
              tasa: Rate.of('1'),
              monto: a.montoAplicado,
              baseLegal: `${catalogo.get(a.conceptoCodigo).baseLegal} — asignación: ${a.razon}`,
            },
            catalogo,
            null,
          );
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
        const obreroColab = especiales
          .reduce((acc, l) => acc.plus(l.monto), r.totalObrero)
          .plus(isrColab)
          .plus(asignacion.totalAplicado);
        totBruto = totBruto.plus(brutoColab);
        totObrero = totObrero.plus(obreroColab);
        totPatronal = totPatronal.plus(r.totalPatronal);
        totIsr = totIsr.plus(isrColab);
        totDescuentos = totDescuentos.plus(asignacion.totalAplicado);
        totArrastrado = totArrastrado.plus(asignacion.totalArrastrado);
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
        advertencias: [...advertencias],
        // Asignación de descuentos con restricciones (ADR-004, Art. 161).
        descuentos: {
          aplicado: totDescuentos.toFixed2(),
          arrastrado: totArrastrado.toFixed2(),
          nota:
            'Los descuentos de acreedor se asignan con los topes del Art. 161 (50% global, 30% ' +
            'vivienda, pensión alimenticia exenta) y no se restan uno a uno. Lo que no cupo ' +
            'queda como saldo arrastrado y NO se aplica solo al período siguiente: la consulta ' +
            'E5 sigue abierta. El orden entre acreedores ordinarios es por antigüedad de la ' +
            'orden (consulta E1, decisión de producto).',
        },
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
   * Calcula una partida del Décimo Tercer Mes (base legal §3, Decreto 19 de 1973).
   *
   * A diferencia de la planilla ordinaria, aquí no hay devengo: la partida sale
   * de lo que el trabajador YA percibió en la ventana de cuatro meses, releído
   * de las líneas de planilla persistidas. Un colaborador que entró a mitad del
   * período acumula menos por construcción, así que el tiempo de servicio del
   * Art. 2º del Decreto 221 no necesita prorrateo aparte.
   *
   * Las retenciones no se calculan aquí: la partida se emite como una línea del
   * concepto `xiii_mes` y se deja que `acumularBases` decida qué le aplica. El
   * catálogo ya declara que cotiza CSS al 7.25%, que NO cotiza Seguro Educativo
   * y que grava ISR por el régimen ordinario — el mismo camino que cualquier
   * otro concepto (ADR-002).
   */
  private async calcularPartidaDecimo(
    tx: TenantTx,
    ctx: Ctx,
    cab: typeof schema.planillaCabecera.$inferSelect,
    catalogo: CatalogoConceptos,
  ): Promise<unknown> {
    const fecha = cab.periodoHasta;
    const ciclo = await resolverCicloXiii(tx, fecha);
    const ventana = ventanaDePago(fecha, ciclo);
    const [emp] = await tx.select().from(schema.empresa);
    if (!emp) throw new Error('No hay empresa activa en el contexto de la transacción.');

    const basesPorColaborador = await acumularVentana(tx, ventana, cab.id, catalogo);
    const colabs = await tx.select().from(schema.colaborador);
    const porId = new Map(colabs.map((c) => [c.id, c]));

    let totBruto = Money.ZERO;
    let totObrero = Money.ZERO;
    let totIsr = Money.ZERO;
    let pagados = 0;
    const pendientes = new Set<string>();
    const advertencias: string[] = [];

    // El período declarado en la cabecera no manda: la ventana la fija el
    // Decreto. Si el usuario escribió otras fechas, se calcula bien y se avisa.
    if (cab.periodoDesde !== ventana.desde || cab.periodoHasta !== ventana.hasta) {
      advertencias.push(
        `El período declarado (${cab.periodoDesde} → ${cab.periodoHasta}) no coincide con la ` +
          `ventana legal de la ${String(ventana.numero)}ª partida (${ventana.desde} → ` +
          `${ventana.hasta}). Se acumuló sobre la ventana legal.`,
      );
    }

    // Se recorre a quien acumuló algo, no a los colaboradores "activos": un
    // trabajador que salió a mitad del período igual generó su partida.
    for (const [colaboradorId, basesVentana] of basesPorColaborador) {
      const colab = porId.get(colaboradorId);
      // Sin base positiva no hay partida: un colaborador cuya única línea en la
      // ventana fue una ausencia no genera un XIII negativo.
      if (!colab || basesVentana.xiii.isZero() || basesVentana.xiii.isNegative()) continue;
      for (const c of basesVentana.conceptosPendientes) pendientes.add(c);

      // Art. 3º: el aguinaldo acostumbrado solo entra si la empresa lo tiene
      // pactado Y el colaborador tiene monto, y solo en la última partida.
      const aguinaldo =
        emp.pagaAguinaldoAcostumbrado &&
        colab.montoAguinaldo !== null &&
        ventana.numero === ciclo.ultimaPartida
          ? Money.of(colab.montoAguinaldo)
          : null;

      const r = calcularPartidaXiii({
        salariosDelPeriodo: basesVentana.xiii,
        divisor: ciclo.divisor,
        divisorGeneral: ciclo.divisorGeneral,
        aguinaldoAcostumbrado: aguinaldo,
        partida: ventana,
        ultimaPartida: ciclo.ultimaPartida,
        concepto: 'xiii_mes',
        baseLegal: catalogo.get('xiii_mes').baseLegal,
      });
      for (const a of r.advertencias) {
        advertencias.push(`${colab.nombres} ${colab.apellidos}: ${a}`);
      }

      // La partida vuelve a pasar por la matriz de incidencia: es el catálogo,
      // no este método, quien sabe que el XIII cotiza al 7.25% y no paga SE.
      const basesPartida = acumularBases(
        [{ conceptoCodigo: 'xiii_mes', monto: r.linea.monto }],
        catalogo,
      );
      const especiales = gruposCssEspeciales(basesPartida).map((g) =>
        calcularCssTasaEspecial(
          'css_obrero_tasa_especial',
          g.base,
          g.tasaEspecial,
          'Ley Orgánica CSS Art. 101 num. 5; base legal §3.3 — cuota obrera 7.25% sobre el XIII',
        ),
      );
      // El XIII entra al MISMO acumulador anual de ISR que el salario. Bajo el
      // método acumulativo (ADR-014) eso no produce doble gravamen: no hay
      // proyección "× 13" que ya lo contuviera, solo bases realmente percibidas.
      const isrLineas = await calcularRetencionesIsr(
        tx,
        colaboradorId,
        cab.id,
        fecha,
        basesPartida.isr.ordinario,
        basesPartida.isr.gastosRepresentacion,
      );

      for (const l of [r.linea, ...especiales, ...isrLineas]) {
        await this.persistir(tx, ctx, cab.id, colaboradorId, l, catalogo, null);
      }

      const isrColab = isrLineas.reduce((acc, l) => acc.plus(l.monto), Money.ZERO);
      const obreroColab = especiales.reduce((acc, l) => acc.plus(l.monto), Money.ZERO).plus(isrColab);
      totBruto = totBruto.plus(r.linea.monto);
      totObrero = totObrero.plus(obreroColab);
      totIsr = totIsr.plus(isrColab);
      pagados += 1;
    }

    const totales = {
      tipo: TIPO_PLANILLA_XIII,
      colaboradores: pagados,
      bruto: totBruto.toFixed2(),
      deduccionesObrero: totObrero.toFixed2(),
      neto: totBruto.minus(totObrero).toFixed2(),
      // Sin cuota patronal determinada no hay costo del empleador que reportar.
      // Poner el bruto ahí lo haría parecer completo, y no lo está.
      cargasPatronales: null,
      costoEmpleador: null,
      partida: {
        numero: ventana.numero,
        ventanaDesde: ventana.desde,
        ventanaHasta: ventana.hasta,
        divisor: ciclo.divisor,
        baseLegal: 'Decreto de Gabinete 221 de 1971; Decreto 19 de 1973 Art. 3º y 4º',
      },
      advertencias,
      conceptosPendientes: [...pendientes].sort(),
      isr: {
        metodo: 'acumulativo',
        retenido: totIsr.toFixed2(),
        nota:
          'El XIII se suma al mismo acumulado anual que el salario (ADR-014). Bajo el método ' +
          'acumulativo no hay doble gravamen: no existe la proyección «× 13» que ya lo incluía, ' +
          'solo bases efectivamente percibidas.',
      },
      cuotaPatronal: {
        estado: 'no_calculada',
        nota:
          'La cuota PATRONAL sobre el XIII Mes no está determinada (base legal §3.3, consulta A7 ' +
          'abierta): el Decreto 221 lo excluía de las cuotas obrero-patronales salvo el impuesto ' +
          'sobre la renta, pero la práctica sí aplica el 7.25% obrero. Nomix retiene la cuota ' +
          'obrera, que sí está verificada, y no inventa la patronal.',
      },
    };

    const [p] = await tx
      .update(schema.planillaCabecera)
      .set({ estado: 'calculada', totales, calculadaEn: new Date() })
      .where(eq(schema.planillaCabecera.id, cab.id))
      .returning();
    return p;
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
