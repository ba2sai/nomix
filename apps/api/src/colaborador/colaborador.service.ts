import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { schema } from '@nomix/db';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';
import { withContext } from '../db/tenant.js';
import { FieldCrypto } from '../crypto/field-crypto.js';

export interface CrearColaborador {
  codEmpleado: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  identificacion: string;
  sexo?: string | undefined;
  fechaNacimiento?: string | undefined;
  tipoContrato: string;
  tipoPlanilla: string;
  fechaIngreso: string;
  fechaTermino?: string | undefined;
  esTecnico?: boolean | undefined;
  salarioMensual: string;
}

export type ActualizarColaborador = {
  [K in keyof CrearColaborador]?: CrearColaborador[K] | undefined;
};

interface Ctx {
  usuarioId: string;
  empresaId: string;
}

type FilaColaborador = typeof schema.colaborador.$inferSelect;

@Injectable()
export class ColaboradorService {
  constructor(
    @Inject(DB) private readonly handle: DbHandle,
    @Inject(FieldCrypto) private readonly crypto: FieldCrypto,
  ) {}

  /** Descifra la identificación y omite las columnas cifradas internas. */
  private aSalida(f: FilaColaborador): Record<string, unknown> {
    const { idCifrado, idBidx, ...resto } = f;
    void idCifrado;
    void idBidx;
    return { ...resto, identificacion: this.crypto.descifrar(f.idCifrado) };
  }

  async listar(ctx: Ctx): Promise<Record<string, unknown>[]> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const filas = await tx.select().from(schema.colaborador);
      return filas.map((f) => this.aSalida(f));
    });
  }

  async obtener(ctx: Ctx, id: string): Promise<Record<string, unknown>> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const [f] = await tx.select().from(schema.colaborador).where(eq(schema.colaborador.id, id));
      if (!f) throw new NotFoundException('Colaborador no encontrado');
      return this.aSalida(f);
    });
  }

  async crear(ctx: Ctx, dto: CrearColaborador): Promise<Record<string, unknown>> {
    return withContext(this.handle.db, ctx, async (tx) => {
      try {
        const [f] = await tx
          .insert(schema.colaborador)
          .values({
            empresaId: ctx.empresaId,
            codEmpleado: dto.codEmpleado,
            nombres: dto.nombres,
            apellidos: dto.apellidos,
            tipoDocumento: dto.tipoDocumento,
            idCifrado: this.crypto.cifrar(dto.identificacion),
            idBidx: this.crypto.indiceCiego(dto.identificacion),
            sexo: dto.sexo ?? null,
            fechaNacimiento: dto.fechaNacimiento ?? null,
            tipoContrato: dto.tipoContrato,
            tipoPlanilla: dto.tipoPlanilla,
            fechaIngreso: dto.fechaIngreso,
            fechaTermino: dto.fechaTermino ?? null,
            esTecnico: dto.esTecnico ?? false,
            salarioMensual: dto.salarioMensual,
          })
          .returning();
        return this.aSalida(f!);
      } catch (e) {
        throw this.traducirConflicto(e);
      }
    });
  }

  async actualizar(ctx: Ctx, id: string, dto: ActualizarColaborador): Promise<Record<string, unknown>> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const cambios: Partial<typeof schema.colaborador.$inferInsert> = { actualizadoEn: new Date() };
      if (dto.codEmpleado !== undefined) cambios.codEmpleado = dto.codEmpleado;
      if (dto.nombres !== undefined) cambios.nombres = dto.nombres;
      if (dto.apellidos !== undefined) cambios.apellidos = dto.apellidos;
      if (dto.tipoDocumento !== undefined) cambios.tipoDocumento = dto.tipoDocumento;
      if (dto.identificacion !== undefined) {
        cambios.idCifrado = this.crypto.cifrar(dto.identificacion);
        cambios.idBidx = this.crypto.indiceCiego(dto.identificacion);
      }
      if (dto.sexo !== undefined) cambios.sexo = dto.sexo;
      if (dto.fechaNacimiento !== undefined) cambios.fechaNacimiento = dto.fechaNacimiento;
      if (dto.tipoContrato !== undefined) cambios.tipoContrato = dto.tipoContrato;
      if (dto.tipoPlanilla !== undefined) cambios.tipoPlanilla = dto.tipoPlanilla;
      if (dto.fechaIngreso !== undefined) cambios.fechaIngreso = dto.fechaIngreso;
      if (dto.fechaTermino !== undefined) cambios.fechaTermino = dto.fechaTermino;
      if (dto.esTecnico !== undefined) cambios.esTecnico = dto.esTecnico;
      if (dto.salarioMensual !== undefined) cambios.salarioMensual = dto.salarioMensual;

      try {
        const [f] = await tx
          .update(schema.colaborador)
          .set(cambios)
          .where(eq(schema.colaborador.id, id))
          .returning();
        if (!f) throw new NotFoundException('Colaborador no encontrado');
        return this.aSalida(f);
      } catch (e) {
        if (e instanceof NotFoundException) throw e;
        throw this.traducirConflicto(e);
      }
    });
  }

  /** Baja (soft): marca cesante y fija fecha de término. No borra el registro. */
  async darDeBaja(ctx: Ctx, id: string, fechaTermino: string): Promise<Record<string, unknown>> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const [f] = await tx
        .update(schema.colaborador)
        .set({ status: 'cesante', fechaTermino, actualizadoEn: new Date() })
        .where(eq(schema.colaborador.id, id))
        .returning();
      if (!f) throw new NotFoundException('Colaborador no encontrado');
      return this.aSalida(f);
    });
  }

  private traducirConflicto(e: unknown): Error {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('ux_colaborador_empresa_cod')) {
      return new ConflictException('Ya existe un colaborador con ese código en la empresa');
    }
    if (msg.includes('ux_colaborador_empresa_idbidx')) {
      return new ConflictException('Ya existe un colaborador con esa identificación en la empresa');
    }
    return e instanceof Error ? e : new Error(msg);
  }
}
