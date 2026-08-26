import { Inject, Injectable } from '@nestjs/common';
import { schema } from '@nomix/db';
import { Money, Rate, calcularSeguridadSocial, type LineaCalculada } from '@nomix/payroll-engine';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';
import { withContext } from '../db/tenant.js';
import { resolverTasa } from '../rules/rule-resolver.js';

export interface ColaboradorInput {
  nombre: string;
  salario: string;
  horasExtra?: string | undefined;
  vacaciones?: string | undefined;
}

export interface PreviewInput {
  usuarioId: string;
  empresaId: string;
  /** Fecha del período (para resolver las tasas vigentes — ADR-001). */
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

  /**
   * Previsualiza una planilla: calcula CSS y Seguro Educativo (obrero, patronal
   * y Riesgos Profesionales) sobre la base cotizable, con trazabilidad (ADR-005).
   *
   * El ISR queda pendiente: su método de retención en planilla no está
   * confirmado (base legal §4.5, consulta A1). Se expone solo lo verificado.
   */
  async preview(input: PreviewInput): Promise<unknown> {
    return withContext(
      this.handle.db,
      { usuarioId: input.usuarioId, empresaId: input.empresaId },
      async (tx) => {
        // Tasas vigentes en la fecha del período (resueltas desde `regla`).
        const [cssO, cssP, seO, seP] = await Promise.all([
          resolverTasa(tx, 'css_obrero', input.fecha),
          resolverTasa(tx, 'css_patronal', input.fecha),
          resolverTasa(tx, 'seguro_educativo_obrero', input.fecha),
          resolverTasa(tx, 'seguro_educativo_patronal', input.fecha),
        ]);
        // La tarifa de Riesgos Profesionales es configuración por empresa.
        const [emp] = await tx.select().from(schema.empresa);
        const rp = emp?.tasaRiesgoProfesional ?? '0';

        const tasas = {
          cssObrero: Rate.of(cssO),
          cssPatronal: Rate.of(cssP),
          seObrero: Rate.of(seO),
          sePatronal: Rate.of(seP),
          riesgosProfesionales: Rate.of(rp),
        };

        let totalBruto = Money.ZERO;
        let totalObrero = Money.ZERO;
        let totalPatronal = Money.ZERO;
        let totalNeto = Money.ZERO;

        const colaboradores = input.colaboradores.map((c) => {
          const base = Money.of(c.salario)
            .plus(Money.of(c.horasExtra ?? '0'))
            .plus(Money.of(c.vacaciones ?? '0'));
          const r = calcularSeguridadSocial(base, tasas);
          const netoAntesIsr = base.minus(r.totalObrero);

          totalBruto = totalBruto.plus(base);
          totalObrero = totalObrero.plus(r.totalObrero);
          totalPatronal = totalPatronal.plus(r.totalPatronal);
          totalNeto = totalNeto.plus(netoAntesIsr);

          return {
            nombre: c.nombre,
            baseCotizable: base.toFixed2(),
            deduccionesObrero: [r.cssObrero, r.seObrero].map(serializarLinea),
            totalDeduccionesObrero: r.totalObrero.toFixed2(),
            netoAntesIsr: netoAntesIsr.toFixed2(),
            cargasPatronales: [r.cssPatronal, r.sePatronal, r.riesgosProfesionales].map(
              serializarLinea,
            ),
            costoEmpleador: base.plus(r.totalPatronal).toFixed2(),
          };
        });

        return {
          periodo: input.fecha,
          tasasVigentes: {
            cssObrero: tasas.cssObrero.toPercentString(),
            cssPatronal: tasas.cssPatronal.toPercentString(),
            seguroEducativoObrero: tasas.seObrero.toPercentString(),
            seguroEducativoPatronal: tasas.sePatronal.toPercentString(),
            riesgosProfesionales: tasas.riesgosProfesionales.toPercentString(),
          },
          colaboradores,
          totales: {
            bruto: totalBruto.toFixed2(),
            deduccionesObrero: totalObrero.toFixed2(),
            cargasPatronales: totalPatronal.toFixed2(),
            netoAntesIsr: totalNeto.toFixed2(),
            costoEmpleador: totalBruto.plus(totalPatronal).toFixed2(),
          },
          pendiente: {
            isr: 'Método de retención de ISR en planilla no confirmado (base legal §4.5, consulta A1).',
          },
        };
      },
    );
  }
}
