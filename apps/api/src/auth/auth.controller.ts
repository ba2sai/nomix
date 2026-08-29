import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { SessionStore, type SesionData } from './session.store.js';
import { AuthGuard, Sesion, COOKIE_SESION } from './auth.guard.js';
import { permisosDe } from './permisos.js';
import { loadEnv } from '../config/env.js';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const selectSchema = z.object({ empresaId: z.string().uuid() });

@Controller('auth')
export class AuthController {
  private readonly env = loadEnv();

  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionStore) private readonly sesiones: SessionStore,
  ) {}

  private setCookie(reply: FastifyReply, sid: string): void {
    reply.setCookie(COOKIE_SESION, sid, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.env.NODE_ENV === 'production',
      path: '/',
      maxAge: this.env.SESSION_TTL_SECONDS,
    });
  }

  @Post('login')
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ usuarioId: string; empresas: unknown[] }> {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('email y password requeridos');
    const usuarioId = await this.auth.verificarCredenciales(parsed.data.email, parsed.data.password);
    const empresas = await this.auth.membresiasVigentes(usuarioId);
    // Si el usuario tiene una sola empresa, se preselecciona.
    const empresaActivaId = empresas.length === 1 ? empresas[0]!.empresaId : null;
    const sid = await this.sesiones.crear({
      usuarioId,
      empresaActivaId,
      creadoEn: new Date().toISOString(),
    });
    this.setCookie(reply, sid);
    return { usuarioId, empresas };
  }

  @Post('empresa')
  @UseGuards(AuthGuard)
  async seleccionarEmpresa(
    @Body() body: unknown,
    @Sesion() sesion: SesionData,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ empresaActivaId: string; rol: string; permisos: readonly string[] }> {
    const parsed = selectSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('empresaId inválido');
    const m = await this.auth.validarMembresia(sesion.usuarioId, parsed.data.empresaId);
    const actualizada: SesionData = { ...sesion, empresaActivaId: m.empresaId };
    // El sid ya está en la cookie; reescribimos el estado server-side.
    const cookies = (reply.request.cookies ?? {}) as Record<string, string | undefined>;
    const sid = cookies[COOKIE_SESION];
    if (!sid) throw new UnauthorizedException();
    await this.sesiones.actualizar(sid, actualizada);
    this.setCookie(reply, sid); // renueva TTL de la cookie
    return { empresaActivaId: m.empresaId, rol: m.rol, permisos: permisosDe(m.rol) };
  }

  /**
   * Estado de la sesión, incluidos el rol vigente y sus permisos (`ADR-018`).
   *
   * El frontend usa `permisos` para no ofrecer lo que el backend va a
   * rechazar: un botón "Aprobar" que siempre da 403 es peor que no tenerlo.
   * Es conveniencia de interfaz, NO el control — la autorización se decide en
   * el servidor y la UI solo la refleja.
   *
   * El rol se recalcula aquí en vez de leerse de la sesión: si a alguien le
   * cambian el rol mientras tiene la pantalla abierta, el siguiente `me` ya
   * trae el nuevo.
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Sesion() sesion: SesionData): Promise<unknown> {
    const empresas = await this.auth.membresiasVigentes(sesion.usuarioId);
    const rol = sesion.empresaActivaId
      ? await this.auth.rolVigente(sesion.usuarioId, sesion.empresaActivaId)
      : null;
    return {
      usuarioId: sesion.usuarioId,
      empresaActivaId: sesion.empresaActivaId,
      empresas,
      rol,
      permisos: rol ? permisosDe(rol) : [],
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(
    @Sesion() _sesion: SesionData,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ ok: true }> {
    const cookies = (reply.request.cookies ?? {}) as Record<string, string | undefined>;
    const sid = cookies[COOKIE_SESION];
    if (sid) await this.sesiones.destruir(sid);
    reply.clearCookie(COOKIE_SESION, { path: '/' });
    return { ok: true };
  }
}
