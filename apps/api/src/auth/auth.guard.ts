import { Inject, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { SessionStore, type SesionData } from './session.store.js';

export const COOKIE_SESION = 'nomix_sid';

export interface RequestConSesion extends FastifyRequest {
  sesionId?: string;
  sesion?: SesionData;
}

/** Exige una sesión válida. Carga la sesión desde Redis y la adjunta al request. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(SessionStore) private readonly sesiones: SessionStore) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestConSesion>();
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    const sid = cookies[COOKIE_SESION];
    if (!sid) throw new UnauthorizedException('No autenticado');
    const sesion = await this.sesiones.obtener(sid);
    if (!sesion) throw new UnauthorizedException('Sesión expirada');
    req.sesionId = sid;
    req.sesion = sesion;
    return true;
  }
}

/** Inyecta la sesión ya cargada por AuthGuard en un parámetro del handler. */
export const Sesion = createParamDecorator((_data: unknown, ctx: ExecutionContext): SesionData => {
  const req = ctx.switchToHttp().getRequest<RequestConSesion>();
  if (!req.sesion) throw new UnauthorizedException('No autenticado');
  return req.sesion;
});
