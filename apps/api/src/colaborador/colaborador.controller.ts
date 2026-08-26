import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { montoStr } from '@nomix/contracts';
import { AuthGuard, Sesion } from '../auth/auth.guard.js';
import type { SesionData } from '../auth/session.store.js';
import { ColaboradorService } from './colaborador.service.js';

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha debe ser YYYY-MM-DD');

const crearSchema = z.object({
  // Paso 1 — Datos personales
  codEmpleado: z.string().min(1),
  nombres: z.string().min(1),
  apellidos: z.string().min(1),
  tipoDocumento: z.enum(['cedula', 'pasaporte']),
  identificacion: z.string().min(1),
  sexo: z.enum(['M', 'F']).optional(),
  fechaNacimiento: fecha.optional(),
  estadoCivil: z.enum(['soltero', 'casado', 'unido', 'viudo', 'divorciado']).optional(),
  telefono: z.string().optional(),
  correo: z.string().email().optional(),
  // Paso 2 — Contrato y cargo
  cargo: z.string().optional(),
  tipoContrato: z.enum(['indefinido', 'definido', 'obra', 'servicios']),
  tipoPlanilla: z.string().min(1),
  fechaIngreso: fecha,
  fechaTermino: fecha.optional(),
  pProbatorio: z.boolean().optional(),
  esTecnico: z.boolean().optional(),
  // Paso 3 — Salario y banco
  salarioMensual: montoStr,
  formaPago: z.enum(['cheque', 'ach', 'efectivo']).optional(),
  idBanco: z.string().optional(),
  tipoCuenta: z.enum(['ahorro', 'corriente']).optional(),
  cuentaBancaria: z.string().optional(),
  // Paso 5 — Retenciones
  declaraRenta: z.boolean().optional(),
  gastoRep: montoStr.optional(),
});

const actualizarSchema = crearSchema.partial();
const bajaSchema = z.object({ fechaTermino: fecha });

@Controller('colaboradores')
@UseGuards(AuthGuard)
export class ColaboradorController {
  constructor(@Inject(ColaboradorService) private readonly svc: ColaboradorService) {}

  private ctx(sesion: SesionData): { usuarioId: string; empresaId: string } {
    if (!sesion.empresaActivaId) throw new BadRequestException('Selecciona una empresa activa');
    return { usuarioId: sesion.usuarioId, empresaId: sesion.empresaActivaId };
  }

  @Get()
  async listar(@Sesion() s: SesionData): Promise<unknown> {
    return this.svc.listar(this.ctx(s));
  }

  @Get(':id')
  async obtener(@Sesion() s: SesionData, @Param('id') id: string): Promise<unknown> {
    return this.svc.obtener(this.ctx(s), id);
  }

  @Post()
  async crear(@Sesion() s: SesionData, @Body() body: unknown): Promise<unknown> {
    const p = crearSchema.safeParse(body);
    if (!p.success) throw new BadRequestException(p.error.issues.map((i) => i.message).join('; '));
    return this.svc.crear(this.ctx(s), p.data);
  }

  @Patch(':id')
  async actualizar(
    @Sesion() s: SesionData,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const p = actualizarSchema.safeParse(body);
    if (!p.success) throw new BadRequestException(p.error.issues.map((i) => i.message).join('; '));
    return this.svc.actualizar(this.ctx(s), id, p.data);
  }

  @Post(':id/baja')
  async darDeBaja(
    @Sesion() s: SesionData,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const p = bajaSchema.safeParse(body);
    if (!p.success) throw new BadRequestException(p.error.issues.map((i) => i.message).join('; '));
    return this.svc.darDeBaja(this.ctx(s), id, p.data.fechaTermino);
  }
}
