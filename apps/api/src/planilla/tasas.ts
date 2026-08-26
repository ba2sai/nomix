import { schema } from '@nomix/db';
import { Rate } from '@nomix/payroll-engine';
import type { TenantTx } from '../db/tenant.js';
import { resolverTasa } from '../rules/rule-resolver.js';

export interface TasasResueltas {
  cssObrero: Rate;
  cssPatronal: Rate;
  seObrero: Rate;
  sePatronal: Rate;
  riesgosProfesionales: Rate;
}

/** Resuelve las tasas de seguridad social vigentes en `fecha` + RP de la empresa. */
export async function resolverTasasSS(tx: TenantTx, fecha: string): Promise<TasasResueltas> {
  const [cssO, cssP, seO, seP] = await Promise.all([
    resolverTasa(tx, 'css_obrero', fecha),
    resolverTasa(tx, 'css_patronal', fecha),
    resolverTasa(tx, 'seguro_educativo_obrero', fecha),
    resolverTasa(tx, 'seguro_educativo_patronal', fecha),
  ]);
  const [emp] = await tx.select().from(schema.empresa);
  return {
    cssObrero: Rate.of(cssO),
    cssPatronal: Rate.of(cssP),
    seObrero: Rate.of(seO),
    sePatronal: Rate.of(seP),
    riesgosProfesionales: Rate.of(emp?.tasaRiesgoProfesional ?? '0'),
  };
}
