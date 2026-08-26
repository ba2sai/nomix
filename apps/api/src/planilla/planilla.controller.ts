import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { montoStr } from '@nomix/contracts';
import { AuthGuard, Sesion } from '../auth/auth.guard.js';
import type { SesionData } from '../auth/session.store.js';
import { PlanillaService } from './planilla.service.js';

const previewSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha debe ser YYYY-MM-DD'),
  colaboradores: z
    .array(
      z.object({
        nombre: z.string().min(1),
        salario: montoStr,
        horasExtra: montoStr.optional(),
        vacaciones: montoStr.optional(),
      }),
    )
    .min(1),
});

@Controller('planillas')
@UseGuards(AuthGuard)
export class PlanillaController {
  constructor(@Inject(PlanillaService) private readonly planilla: PlanillaService) {}

  @Post('preview')
  async preview(@Body() body: unknown, @Sesion() sesion: SesionData): Promise<unknown> {
    if (!sesion.empresaActivaId) {
      throw new BadRequestException('Selecciona una empresa activa primero');
    }
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join('; '));
    }
    return this.planilla.preview({
      usuarioId: sesion.usuarioId,
      empresaId: sesion.empresaActivaId,
      fecha: parsed.data.fecha,
      colaboradores: parsed.data.colaboradores,
    });
  }

  @Get('preview-empresa')
  async previewEmpresa(@Query('fecha') fecha: unknown, @Sesion() sesion: SesionData): Promise<unknown> {
    if (!sesion.empresaActivaId) {
      throw new BadRequestException('Selecciona una empresa activa primero');
    }
    const f = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(fecha);
    if (!f.success) throw new BadRequestException('Parámetro fecha=YYYY-MM-DD requerido');
    return this.planilla.previewEmpresa(sesion.usuarioId, sesion.empresaActivaId, f.data);
  }
}
