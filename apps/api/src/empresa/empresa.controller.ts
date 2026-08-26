import { Controller, Get, Inject, UseGuards, BadRequestException } from '@nestjs/common';
import { schema } from '@nomix/db';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';
import { withContext } from '../db/tenant.js';
import { AuthGuard, Sesion } from '../auth/auth.guard.js';
import type { SesionData } from '../auth/session.store.js';

/**
 * Endpoint de dominio tenant-scoped. Demuestra la cadena completa:
 * cookie de sesión → AuthGuard → empresa activa de la sesión → withContext
 * fija el RLS → la consulta solo devuelve datos de esa empresa.
 */
@Controller('empresa')
@UseGuards(AuthGuard)
export class EmpresaController {
  constructor(@Inject(DB) private readonly handle: DbHandle) {}

  @Get('actual')
  async actual(@Sesion() sesion: SesionData): Promise<unknown> {
    if (!sesion.empresaActivaId) {
      throw new BadRequestException('No hay empresa activa. Selecciona una en POST /api/auth/empresa');
    }
    const filas = await withContext(
      this.handle.db,
      { usuarioId: sesion.usuarioId, empresaId: sesion.empresaActivaId },
      (tx) => tx.select().from(schema.empresa),
    );
    return { empresa: filas[0] ?? null };
  }
}
