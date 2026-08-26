import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { montoStr } from '@nomix/contracts';
import { AuthGuard, Sesion } from '../auth/auth.guard.js';
import type { SesionData } from '../auth/session.store.js';
import { PlanillaService } from './planilla.service.js';
import { ProcesoService } from './proceso.service.js';

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha debe ser YYYY-MM-DD');

const previewSchema = z.object({
  fecha,
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

const crearSchema = z.object({
  tipo: z.string().min(1),
  periodoDesde: fecha,
  periodoHasta: fecha,
  fechaPago: fecha.optional(),
});

@Controller('planillas')
@UseGuards(AuthGuard)
export class PlanillaController {
  constructor(
    @Inject(PlanillaService) private readonly planilla: PlanillaService,
    @Inject(ProcesoService) private readonly proceso: ProcesoService,
  ) {}

  private ctx(s: SesionData): { usuarioId: string; empresaId: string } {
    if (!s.empresaActivaId) throw new BadRequestException('Selecciona una empresa activa');
    return { usuarioId: s.usuarioId, empresaId: s.empresaActivaId };
  }

  // --- Planilla persistida (máquina de estados) ---

  @Post()
  async crear(@Body() body: unknown, @Sesion() s: SesionData): Promise<unknown> {
    const p = crearSchema.safeParse(body);
    if (!p.success) throw new BadRequestException(p.error.issues.map((i) => i.message).join('; '));
    return this.proceso.crear(this.ctx(s), p.data);
  }

  @Get()
  async listar(@Sesion() s: SesionData): Promise<unknown> {
    return this.proceso.listar(this.ctx(s));
  }

  @Get(':id')
  async obtener(@Param('id') id: string, @Sesion() s: SesionData): Promise<unknown> {
    return this.proceso.obtener(this.ctx(s), id);
  }

  @Post(':id/calcular')
  async calcular(@Param('id') id: string, @Sesion() s: SesionData): Promise<unknown> {
    return this.proceso.calcular(this.ctx(s), id);
  }

  @Post(':id/aprobar')
  async aprobar(@Param('id') id: string, @Sesion() s: SesionData): Promise<unknown> {
    return this.proceso.aprobar(this.ctx(s), id);
  }

  @Post(':id/cerrar')
  async cerrar(@Param('id') id: string, @Sesion() s: SesionData): Promise<unknown> {
    return this.proceso.cerrar(this.ctx(s), id);
  }

  // --- Previews en vivo (simulador, sin persistir) ---

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
