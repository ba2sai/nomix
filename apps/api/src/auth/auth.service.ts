import { Inject, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { schema } from '@nomix/db';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';
import { withContext } from '../db/tenant.js';
import { verifyPassword } from './password.js';

export interface Membresia {
  empresaId: string;
  nombreComercial: string;
  rol: string;
}

@Injectable()
export class AuthService {
  constructor(@Inject(DB) private readonly handle: DbHandle) {}

  /** Verifica credenciales y devuelve el id del usuario. `usuario` no tiene RLS. */
  async verificarCredenciales(email: string, password: string): Promise<string> {
    const filas = await this.handle.db
      .select({ id: schema.usuario.id, hash: schema.usuario.passwordHash, activo: schema.usuario.activo })
      .from(schema.usuario)
      .where(eq(schema.usuario.email, email))
      .limit(1);
    const u = filas[0];
    // Mensaje genérico y verificación siempre ejecutada: no revela si el email existe.
    const hash = u?.hash ?? 'scrypt$00$00';
    const ok = verifyPassword(password, hash);
    if (!u || !u.activo || !ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return u.id;
  }

  /**
   * Membresías VIGENTES del usuario. Usa la función SECURITY DEFINER
   * `mis_empresas()`, que se acota a app_current_usuario() y no depende del RLS
   * de `empresa` (necesario en el login, antes de elegir empresa activa).
   */
  async membresiasVigentes(usuarioId: string): Promise<Membresia[]> {
    return withContext(this.handle.db, { usuarioId }, async (tx) => {
      const filas = await tx.execute(
        sql`select empresa_id, nombre_comercial, rol from mis_empresas()`,
      );
      return (filas as unknown as ReadonlyArray<Record<string, string>>).map((f) => ({
        empresaId: f['empresa_id']!,
        nombreComercial: f['nombre_comercial']!,
        rol: f['rol']!,
      }));
    });
  }

  /**
   * Rol vigente del usuario en la empresa, o `null` si su membresía terminó o
   * nunca existió (`ADR-018`).
   *
   * Se resuelve en CADA petición en vez de copiarse a la sesión de Redis: el
   * rol es un dato con vigencia (`usuario_empresa.vigente_hasta`) y una copia
   * en la sesión sería una foto que envejece sin avisar. Revocar o degradar a
   * alguien tiene que surtir efecto en la siguiente petición, no en su próximo
   * inicio de sesión — que con expiración deslizante podría no llegar nunca.
   *
   * Delega en `app_rol_actual()`, la misma función que la base de datos usa
   * para decidir la vigencia, para que la capa de aplicación y el RLS no
   * puedan discrepar sobre quién sigue dentro.
   */
  async rolVigente(usuarioId: string, empresaId: string): Promise<string | null> {
    return withContext(this.handle.db, { usuarioId, empresaId }, async (tx) => {
      const filas = await tx.execute(sql`select app_rol_actual() as rol`);
      const r = (filas as unknown as ReadonlyArray<{ rol: string | null }>)[0];
      return r?.rol ?? null;
    });
  }

  /** Valida que el usuario tenga membresía vigente en la empresa elegida. */
  async validarMembresia(usuarioId: string, empresaId: string): Promise<Membresia> {
    const membresias = await this.membresiasVigentes(usuarioId);
    const m = membresias.find((x) => x.empresaId === empresaId);
    if (!m) throw new ForbiddenException('Sin membresía vigente en esa empresa');
    return m;
  }
}
