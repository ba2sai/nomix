import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { montoStr } from '@nomix/contracts';
import { AuthGuard, Sesion } from '../auth/auth.guard.js';
import { PermisoGuard, Requiere } from '../auth/permiso.guard.js';
import type { SesionData } from '../auth/session.store.js';
import { ColaboradorService } from './colaborador.service.js';
import { ConceptoFijoService } from './concepto-fijo.service.js';
import { DocumentoService, TIPOS_DOCUMENTO, type TipoDocumento } from './documento.service.js';

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

/**
 * Asignación de un concepto fijo (`ADR-021`). No lleva `tipo` ni unidad: eso lo
 * dice el catálogo, y aceptarlo aquí permitiría contradecirlo (`ADR-002`).
 */
const conceptoFijoSchema = z
  .object({
    conceptoCodigo: z.string().min(1),
    monto: montoStr.optional(),
    cantidad: montoStr.optional(),
    vigenteDesde: fecha,
    vigenteHasta: fecha.optional(),
    nota: z.string().max(500).optional(),
  })
  .refine((v) => v.monto !== undefined || v.cantidad !== undefined, {
    message: 'Indica monto o cantidad',
  });

const cerrarConceptoSchema = z.object({ vigenteHasta: fecha });
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
  constructor(
    @Inject(ColaboradorService) private readonly svc: ColaboradorService,
    @Inject(ConceptoFijoService) private readonly fijos: ConceptoFijoService,
    @Inject(DocumentoService) private readonly documentos: DocumentoService,
  ) {}

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

  // --- Conceptos fijos de la ficha (ADR-021) ---

  @Get(':id/conceptos')
  @Requiere('colaborador:leer')
  async listarConceptos(@Sesion() s: SesionData, @Param('id') id: string): Promise<unknown> {
    return this.fijos.listar(this.ctx(s), id);
  }

  @Post(':id/conceptos')
  @Requiere('colaborador:escribir')
  async crearConcepto(
    @Sesion() s: SesionData,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const p = conceptoFijoSchema.safeParse(body);
    if (!p.success) throw new BadRequestException(p.error.issues.map((i) => i.message).join('; '));
    return this.fijos.crear(this.ctx(s), id, p.data);
  }

  /**
   * Cierra la asignación con una fecha; NO la borra. Borrarla reescribiría el
   * pasado: recalcular una planilla anterior daría otro resultado sin que nada
   * explique por qué (`ADR-001`).
   */
  @Delete(':id/conceptos/:conceptoId')
  @Requiere('colaborador:escribir')
  async cerrarConcepto(
    @Sesion() s: SesionData,
    @Param('id') id: string,
    @Param('conceptoId') conceptoId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const p = cerrarConceptoSchema.safeParse(body ?? {});
    const hasta = p.success ? p.data.vigenteHasta : new Date().toISOString().slice(0, 10);
    return this.fijos.cerrar(this.ctx(s), id, conceptoId, hasta);
  }

  // --- Documentos del colaborador (ADR-022) ---

  @Get(':id/documentos')
  @Requiere('colaborador:leer')
  async listarDocumentos(@Sesion() s: SesionData, @Param('id') id: string): Promise<unknown> {
    return this.documentos.listar(this.ctx(s), id);
  }

  /**
   * Subida multipart. El archivo se lee a memoria con el tope ya aplicado por
   * fastify, así que un envío enorme se corta mientras llega.
   */
  @Post(':id/documentos')
  @Requiere('colaborador:escribir')
  async subirDocumento(
    @Sesion() s: SesionData,
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ): Promise<unknown> {
    const parte = await (
      req as FastifyRequest & {
        file: () => Promise<
          | {
              filename: string;
              mimetype: string;
              toBuffer: () => Promise<Buffer>;
              fields: Record<string, unknown>;
            }
          | undefined
        >;
      }
    ).file();
    if (!parte) throw new BadRequestException('Falta el archivo');

    // El tipo viaja como campo del formulario. Se valida contra la lista
    // cerrada: un `tipo` libre convierte la pestaña en un cajón desordenado.
    const campoTipo = parte.fields['tipo'];
    const bruto =
      typeof campoTipo === 'object' && campoTipo !== null && 'value' in campoTipo
        ? String((campoTipo as { value: unknown }).value)
        : 'otro';
    const tipo: TipoDocumento = (TIPOS_DOCUMENTO as readonly string[]).includes(bruto)
      ? (bruto as TipoDocumento)
      : 'otro';

    return this.documentos.guardar(this.ctx(s), id, tipo, {
      nombre: parte.filename,
      mime: parte.mimetype,
      contenido: await parte.toBuffer(),
    });
  }

  /**
   * Descarga. Pasa por la API a propósito y no por un servidor de estáticos:
   * un contrato lleva el salario pactado, así que cada lectura tiene que
   * aplicar el RLS del inquilino y quedar en la bitácora (`ADR-019`).
   */
  @Get(':id/documentos/:docId/descargar')
  @Requiere('colaborador:leer')
  async descargarDocumento(
    @Sesion() s: SesionData,
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const d = await this.documentos.descargar(this.ctx(s), id, docId);
    // `attachment` y no `inline`: que el navegador no intente renderizar un
    // archivo subido por un usuario en el origen de la aplicación.
    await reply
      .header('Content-Type', d.mime)
      .header('Content-Disposition', `attachment; filename="${encodeURIComponent(d.nombre)}"`)
      .send(d.contenido);
  }

  @Delete(':id/documentos/:docId')
  @Requiere('colaborador:escribir')
  async eliminarDocumento(
    @Sesion() s: SesionData,
    @Param('id') id: string,
    @Param('docId') docId: string,
  ): Promise<unknown> {
    return this.documentos.eliminar(this.ctx(s), id, docId);
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
