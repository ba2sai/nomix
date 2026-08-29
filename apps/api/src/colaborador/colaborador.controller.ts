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
import { PermisoGuard, Requiere } from '../auth/permiso.guard.js';
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
  // Aguinaldo pactado o acostumbrado (Decreto 19 de 1973 Art. 3º): compite con
  // la 3ª partida del XIII y se paga la suma más favorable al trabajador.
  montoAguinaldo: montoStr.optional(),
});

const actualizarSchema = crearSchema.partial();
const bajaSchema = z.object({ fechaTermino: fecha });

/**
 * Propuesta de liquidación. `semanasPreaviso` lo decide RRHH y no se infiere de
 * la causa: si el preaviso se otorgó en tiempo no hay pago, y si el trabajador
 * renunció sin avisar la semana del Art. 222 va en contra (valor negativo).
 */
const liquidacionSchema = z.object({
  fechaSalida: fecha,
  causa: z.enum([
    'despido_injustificado',
    'despido_justificado',
    'renuncia',
    'renuncia_justificada',
    'mutuo_acuerdo',
    'vencimiento_contrato',
  ]),
  semanasPreaviso: z.string().regex(/^-?\d+(\.\d+)?$/, 'semanasPreaviso debe ser numérico').optional(),
});

@Controller('colaboradores')
@UseGuards(AuthGuard, PermisoGuard)
export class ColaboradorController {
  constructor(@Inject(ColaboradorService) private readonly svc: ColaboradorService) {}

  private ctx(sesion: SesionData): { usuarioId: string; empresaId: string } {
    if (!sesion.empresaActivaId) throw new BadRequestException('Selecciona una empresa activa');
    return { usuarioId: sesion.usuarioId, empresaId: sesion.empresaActivaId };
  }

  @Get()
  @Requiere('colaborador:leer')
  async listar(@Sesion() s: SesionData): Promise<unknown> {
    return this.svc.listar(this.ctx(s));
  }

  @Get(':id')
  @Requiere('colaborador:leer')
  async obtener(@Sesion() s: SesionData, @Param('id') id: string): Promise<unknown> {
    return this.svc.obtener(this.ctx(s), id);
  }

  @Post()
  @Requiere('colaborador:escribir')
  async crear(@Sesion() s: SesionData, @Body() body: unknown): Promise<unknown> {
    const p = crearSchema.safeParse(body);
    if (!p.success) throw new BadRequestException(p.error.issues.map((i) => i.message).join('; '));
    return this.svc.crear(this.ctx(s), p.data);
  }

  @Patch(':id')
  @Requiere('colaborador:escribir')
  async actualizar(
    @Sesion() s: SesionData,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const p = actualizarSchema.safeParse(body);
    if (!p.success) throw new BadRequestException(p.error.issues.map((i) => i.message).join('; '));
    return this.svc.actualizar(this.ctx(s), id, p.data);
  }

  /**
   * Propuesta de liquidación (ADR-017). Es un POST porque lleva cuerpo (causa,
   * fecha, preaviso), pero NO modifica nada: la baja sigue siendo `:id/baja`.
   */
  @Post(':id/liquidacion')
  @Requiere('liquidacion:proponer')
  async liquidacion(
    @Sesion() s: SesionData,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const p = liquidacionSchema.safeParse(body);
    if (!p.success) throw new BadRequestException(p.error.issues.map((i) => i.message).join('; '));
    return this.svc.liquidacion(this.ctx(s), id, p.data);
  }

  @Post(':id/baja')
  @Requiere('colaborador:escribir')
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
