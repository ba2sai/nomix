import { BadRequestException, Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, Sesion } from '../auth/auth.guard.js';
import type { SesionData } from '../auth/session.store.js';
import { ConceptoService } from './concepto.service.js';

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha debe ser YYYY-MM-DD');

@Controller('conceptos')
@UseGuards(AuthGuard)
export class ConceptoController {
  constructor(@Inject(ConceptoService) private readonly svc: ConceptoService) {}

  /**
   * Catálogo vigente. `fecha` es opcional y por defecto hoy, pero la UI debe
   * mandar la del período que está capturando: la incidencia está versionada.
   */
  @Get()
  async listar(@Query('fecha') q: unknown, @Sesion() s: SesionData): Promise<unknown> {
    if (!s.empresaActivaId) throw new BadRequestException('Selecciona una empresa activa');
    const hoy = new Date().toISOString().slice(0, 10);
    const f = fecha.safeParse(q ?? hoy);
    if (!f.success) throw new BadRequestException('Parámetro fecha=YYYY-MM-DD inválido');
    return this.svc.listar({ usuarioId: s.usuarioId, empresaId: s.empresaActivaId }, f.data);
  }
}
