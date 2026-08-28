import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { schema } from '@nomix/db';
import {
  Money,
  calcularSeguridadSocial,
  devengarSalarioBase,
  type LineaCalculada,
} from '@nomix/payroll-engine';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';
import { withContext } from '../db/tenant.js';
import { resolverTasasSS, type TasasResueltas } from './tasas.js';
import { resolverParametrosDevengo } from './devengo-params.js';

export interface ColaboradorInput {
  nombre: string;
  salario: string;
  horasExtra?: string | undefined;
  vacaciones?: string | undefined;
}

export interface PreviewInput {
  usuarioId: string;
  empresaId: string;
  fecha: string;
  colaboradores: ColaboradorInput[];
}

function serializarLinea(l: LineaCalculada): Record<string, string> {
  return {
    concepto: l.concepto,
    base: l.base.toFixed2(),
    tasa: l.tasa.toPercentString(),
    monto: l.monto.toFixed2(),
    baseLegal: l.baseLegal,
  };
}

@Injectable()
export class PlanillaService {
  constructor(@Inject(DB) private readonly handle: DbHandle) {}

  private lineaColaborador(nombre: string, base: Money, tasas: TasasResueltas) {
    const r = calcularSeguridadSocial(base, tasas);
    const netoAntesIsr = base.minus(r.totalObrero);
    return {
      salida: {
        nombre,
        baseCotizable: base.toFixed2(),
        deduccionesObrero: [r.cssObrero, r.seObrero].map(serializarLinea),
        totalDeduccionesObrero: r.totalObrero.toFixed2(),
        netoAntesIsr: netoAntesIsr.toFixed2(),
        cargasPatronales: [r.cssPatronal, r.sePatronal, r.riesgosProfesionales].map(serializarLinea),
        costoEmpleador: base.plus(r.totalPatronal).toFixed2(),
      },
      base,
      totalObrero: r.totalObrero,
      totalPatronal: r.totalPatronal,
      netoAntesIsr,
    };
  }

  private armarRespuesta(fecha: string, tasas: TasasResueltas, filas: ReturnType<PlanillaService['lineaColaborador']>[]) {
    let bruto = Money.ZERO;
    let obrero = Money.ZERO;
    let patronal = Money.ZERO;
    let neto = Money.ZERO;
    for (const f of filas) {
      bruto = bruto.plus(f.base);
      obrero = obrero.plus(f.totalObrero);
      patronal = patronal.plus(f.totalPatronal);
      neto = neto.plus(f.netoAntesIsr);
    }
    return {
      periodo: fecha,
      tasasVigentes: {
        cssObrero: tasas.cssObrero.toPercentString(),
        cssPatronal: tasas.cssPatronal.toPercentString(),
        seguroEducativoObrero: tasas.seObrero.toPercentString(),
        seguroEducativoPatronal: tasas.sePatronal.toPercentString(),
        riesgosProfesionales: tasas.riesgosProfesionales.toPercentString(),
      },
      colaboradores: filas.map((f) => f.salida),
      totales: {
        bruto: bruto.toFixed2(),
        deduccionesObrero: obrero.toFixed2(),
        cargasPatronales: patronal.toFixed2(),
        netoAntesIsr: neto.toFixed2(),
        costoEmpleador: bruto.plus(patronal).toFixed2(),
      },
      pendiente: {
        isr: 'Método de retención de ISR en planilla no confirmado (base legal §4.5, consulta A1).',
      },
    };
  }

  /** Previsualiza a partir de colaboradores enviados en el body. */
  async preview(input: PreviewInput): Promise<unknown> {
    return withContext(
      this.handle.db,
      { usuarioId: input.usuarioId, empresaId: input.empresaId },
      async (tx) => {
        const tasas = await resolverTasasSS(tx, input.fecha);
        const filas = input.colaboradores.map((c) =>
          this.lineaColaborador(
            c.nombre,
            Money.of(c.salario).plus(Money.of(c.horasExtra ?? '0')).plus(Money.of(c.vacaciones ?? '0')),
            tasas,
          ),
        );
        return this.armarRespuesta(input.fecha, tasas, filas);
      },
    );
  }

  /**
   * Previsualiza sobre los colaboradores ACTIVOS guardados de la empresa.
   *
   * Aplica el MISMO prorrateo que `ProcesoService.calcular`, para que el
   * simulador y la planilla persistida no den números distintos sobre los
   * mismos datos. Lo que aún no incluye es el devengado variable del período:
   * los movimientos se capturan contra una planilla y aquí no hay ninguna.
   */
  async previewEmpresa(
    usuarioId: string,
    empresaId: string,
    fecha: string,
    tipoPlanilla = 'quincenal',
  ): Promise<unknown> {
    return withContext(this.handle.db, { usuarioId, empresaId }, async (tx) => {
      const tasas = await resolverTasasSS(tx, fecha);
      const params = await resolverParametrosDevengo(tx, tipoPlanilla, fecha);
      // El período del preview es el mes de `fecha`; con `mitad_mensual` no
      // influye, y con `dias_reales` da los días efectivos del corte.
      const periodo = { desde: `${fecha.slice(0, 7)}-01`, hasta: fecha };
      const colabs = await tx
        .select({
          nombres: schema.colaborador.nombres,
          apellidos: schema.colaborador.apellidos,
          salario: schema.colaborador.salarioMensual,
        })
        .from(schema.colaborador)
        .where(eq(schema.colaborador.status, 'activo'));
      const filas = colabs.map((c) =>
        this.lineaColaborador(
          `${c.nombres} ${c.apellidos}`,
          devengarSalarioBase(Money.of(c.salario), periodo, params).monto,
          tasas,
        ),
      );
      const base = this.armarRespuesta(fecha, tasas, filas);
      return {
        ...base,
        baseCalculo: `salario base prorrateado (${params.metodo}) de colaboradores activos`,
      };
    });
  }
}
