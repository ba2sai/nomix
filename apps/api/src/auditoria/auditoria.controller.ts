import { BadRequestException, Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, Sesion } from '../auth/auth.guard.js';
import { PermisoGuard, Requiere } from '../auth/permiso.guard.js';
import type { SesionData } from '../auth/session.store.js';
import { AuditoriaService } from './auditoria.service.js';

const limiteSchema = z.coerce.number().int().min(1).max(500).default(100);

/**
 * Lectura de la bitácora de acceso (`ADR-019`).
 *
 * No hay endpoint de escritura, ni de borrado, ni de corrección: los asientos
 * los pone el `PermisoGuard` y la base de datos no tiene política de UPDATE ni
 * de DELETE sobre la tabla. Una bitácora con API de edición no es una bitácora.
 */
@Controller('auditoria')
@UseGuards(AuthGuard, PermisoGuard)
export class AuditoriaController {
  constructor(@Inject(AuditoriaService) private readonly auditoria: AuditoriaService) {}

  @Get()
  @Requiere('auditoria:leer')
  async listar(@Sesion() s: SesionData, @Query('limite') limite: unknown): Promise<unknown> {
    if (!s.empresaActivaId) throw new BadRequestException('Selecciona una empresa activa');
    const p = limiteSchema.safeParse(limite ?? undefined);
    if (!p.success) throw new BadRequestException('limite debe ser un entero entre 1 y 500');
    return this.auditoria.listar(
      { usuarioId: s.usuarioId, empresaId: s.empresaActivaId },
      p.data,
    );
  }
}
