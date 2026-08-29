import {
  Inject,
  Injectable,
  ForbiddenException,
  ServiceUnavailableException,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { puede, PERMISOS_SENSIBLES, type Permiso } from './permisos.js';
import type { RequestConSesion } from './auth.guard.js';

export const PERMISO_KEY = 'nomix:permiso';

/**
 * Declara el permiso que exige una ruta (`ADR-018`).
 *
 * La ruta declara el VERBO, nunca el rol: `@Requiere('planilla:aprobar')`, no
 * `@Roles('admin_rrhh')`. Así, cambiar quién aprueba es editar la matriz en un
 * solo archivo, y no salir a cazar decoradores por los controladores.
 */
export const Requiere = (permiso: Permiso): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISO_KEY, permiso);

export interface RequestConRol extends RequestConSesion {
  rol?: string;
}

/**
 * Autorización + bitácora, en el orden en que importan (`ADR-018`, `ADR-019`).
 *
 * Corre DESPUÉS de `AuthGuard` (que solo prueba que hay sesión) y hace tres
 * cosas que aquélla no hace:
 *
 *  1. **Revalida la membresía en cada petición.** La sesión vive en Redis con
 *     expiración deslizante; si el rol se resolviera al iniciar sesión y se
 *     guardara ahí, revocar a alguien no surtiría efecto hasta su próximo
 *     login — y con actividad continua, nunca. Es una consulta indexada por
 *     petición y compra que quitar un acceso lo quite de verdad.
 *  2. **Comprueba el permiso** contra la matriz.
 *  3. **Deja rastro** de todo acceso a datos sensibles, permitido o denegado.
 *
 * La base de datos vuelve a comprobar la vigencia por su cuenta (`rls.sql`
 * hace que `app_current_empresa()` exija membresía viva), así que esto es la
 * capa de aplicación de la "doble capa" de ARCHITECTURE §5.2 — no la única.
 * Su valor añadido es dar un 403 explicable en vez de un resultado vacío.
 */
@Injectable()
export class PermisoGuard implements CanActivate {
  private readonly log = new Logger(PermisoGuard.name);

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuditoriaService) private readonly auditoria: AuditoriaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const permiso = this.reflector.getAllAndOverride<Permiso | undefined>(PERMISO_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    // Sin permiso declarado no hay nada que autorizar aquí (login, health).
    if (!permiso) return true;

    const req = ctx.switchToHttp().getRequest<RequestConRol>();
    const sesion = req.sesion;
    if (!sesion) throw new ForbiddenException('No autenticado');

    const empresaId = sesion.empresaActivaId;
    if (!empresaId) throw new ForbiddenException('Selecciona una empresa activa');

    const ruta = req.url.split('?')[0] ?? req.url;
    const metodo = req.method;
    const ip = req.ip;
    const recursoId = this.recursoDe(req);

    const asiento = {
      usuarioId: sesion.usuarioId,
      empresaId,
      accion: permiso,
      metodo,
      ruta,
      recursoId,
      ip,
    };

    // 1. Membresía viva AHORA, no cuando se abrió la sesión.
    const rol = await this.auth.rolVigente(sesion.usuarioId, empresaId);
    if (rol === null) {
      await this.auditoria.registrarSinFallar({
        ...asiento,
        rol: 'desconocido',
        resultado: 'denegado',
        motivo: 'membresía no vigente',
      });
      throw new ForbiddenException('Tu acceso a esta empresa ya no está vigente');
    }

    // 2. La matriz.
    if (!puede(rol, permiso)) {
      await this.auditoria.registrarSinFallar({
        ...asiento,
        rol,
        resultado: 'denegado',
        motivo: `el rol ${rol} no tiene ${permiso}`,
      });
      throw new ForbiddenException(`Tu rol (${rol}) no permite ${permiso}`);
    }

    req.rol = rol;

    // 3. El rastro. Solo para lo que expone remuneración: auditar un health
    // check llenaría la bitácora de ruido y haría más difícil encontrar el
    // acceso que sí importa.
    if (PERMISOS_SENSIBLES.has(permiso)) {
      try {
        await this.auditoria.registrar({
          ...asiento,
          rol,
          resultado: 'permitido',
          motivo: null,
        });
      } catch (e) {
        // Fallar CERRADO, y esto es una decisión, no una precaución genérica:
        // ADR-007 acepta no cifrar `salario_base` a cambio de "control de
        // acceso + trazabilidad". Servir el salario cuando la trazabilidad
        // está caída rompe el trato. Se prefiere no responder a responder sin
        // dejar rastro.
        this.log.error(
          `Bitácora no disponible; se deniega ${permiso} a ${sesion.usuarioId}: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
        throw new ServiceUnavailableException(
          'La bitácora de acceso no está disponible y este dato no se sirve sin registrarlo',
        );
      }
    }

    return true;
  }

  /** Id del recurso concreto si la ruta lo lleva; null en los listados. */
  private recursoDe(req: RequestConRol): string | null {
    const params = (req.params ?? {}) as Record<string, string | undefined>;
    return params['id'] ?? params['colaboradorId'] ?? null;
  }
}
