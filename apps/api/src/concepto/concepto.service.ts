import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { CatalogoConceptos, Rate, type Concepto } from '@nomix/payroll-engine';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';
import { withContext, type TenantTx } from '../db/tenant.js';

interface FilaConcepto {
  codigo: string;
  nombre: string;
  tipo: string;
  unidad: string;
  incide_css: boolean;
  tasa_css_especial: string | null;
  incide_seguro_educativo: boolean;
  incide_isr: boolean;
  regimen_isr: string;
  incide_base_xiii: boolean;
  incide_promedio_vacaciones: boolean;
  incide_base_liquidacion: boolean;
  es_inembargable: boolean;
  categoria_descuento: string | null;
  base_legal: string;
  confianza: string;
}

function aConcepto(f: FilaConcepto): Concepto {
  return {
    codigo: f.codigo,
    nombre: f.nombre,
    tipo: f.tipo as Concepto['tipo'],
    unidad: f.unidad as Concepto['unidad'],
    incideCss: f.incide_css,
    tasaCssEspecial: f.tasa_css_especial === null ? null : Rate.of(f.tasa_css_especial),
    incideSeguroEducativo: f.incide_seguro_educativo,
    incideIsr: f.incide_isr,
    regimenIsr: f.regimen_isr as Concepto['regimenIsr'],
    incideBaseXiii: f.incide_base_xiii,
    incidePromedioVacaciones: f.incide_promedio_vacaciones,
    incideBaseLiquidacion: f.incide_base_liquidacion,
    esInembargable: f.es_inembargable,
    categoriaDescuento: f.categoria_descuento as Concepto['categoriaDescuento'],
    baseLegal: f.base_legal,
    confianza: f.confianza as Concepto['confianza'],
  };
}

/**
 * Carga el catálogo vigente en `fechaPeriodo` (ADR-002 + ADR-001).
 *
 * `distinct on (codigo) ... order by codigo, empresa_id nulls last` aplica la
 * misma precedencia que `ResolverEnMemoria` en `@nomix/rules`: el override de la
 * empresa (convenio colectivo, régimen CAPAC) gana sobre la regla general del
 * país. El RLS de `concepto` ya limita lo visible a esas dos categorías.
 */
export async function cargarCatalogo(
  tx: TenantTx,
  fechaPeriodo: string,
): Promise<CatalogoConceptos> {
  const filas = await tx.execute(sql`
    select distinct on (codigo)
      codigo, nombre, tipo, unidad,
      incide_css, tasa_css_especial, incide_seguro_educativo,
      incide_isr, regimen_isr, incide_base_xiii,
      incide_promedio_vacaciones, incide_base_liquidacion, es_inembargable,
      categoria_descuento, base_legal, confianza
    from concepto
    where jurisdiccion_id = 'PA'
      and vigente_desde <= ${fechaPeriodo}::date
      and (vigente_hasta is null or vigente_hasta >= ${fechaPeriodo}::date)
    order by codigo, empresa_id nulls last, vigente_desde desc
  `);
  const conceptos = (filas as unknown as readonly FilaConcepto[]).map(aConcepto);
  if (conceptos.length === 0) {
    throw new Error(
      `Catálogo de conceptos vacío para ${fechaPeriodo}. ` +
        `Ejecuta la siembra: pnpm --filter @nomix/api seed`,
    );
  }
  return new CatalogoConceptos(conceptos);
}

@Injectable()
export class ConceptoService {
  constructor(@Inject(DB) private readonly handle: DbHandle) {}

  /** Catálogo para la UI: qué se puede capturar y con qué unidad. */
  async listar(
    ctx: { usuarioId: string; empresaId: string },
    fecha: string,
  ): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const catalogo = await cargarCatalogo(tx, fecha);
      return catalogo.todos().map((c) => ({
        codigo: c.codigo,
        nombre: c.nombre,
        tipo: c.tipo,
        unidad: c.unidad,
        baseLegal: c.baseLegal,
        confianza: c.confianza,
        incidencia: {
          css: c.incideCss,
          tasaCssEspecial: c.tasaCssEspecial?.toPercentString() ?? null,
          seguroEducativo: c.incideSeguroEducativo,
          isr: c.incideIsr,
          regimenIsr: c.regimenIsr,
          xiii: c.incideBaseXiii,
          promedioVacaciones: c.incidePromedioVacaciones,
          liquidacion: c.incideBaseLiquidacion,
          categoriaDescuento: c.categoriaDescuento,
          inembargable: c.esInembargable,
        },
      }));
    });
  }
}
