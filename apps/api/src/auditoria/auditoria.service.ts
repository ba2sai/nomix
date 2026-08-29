import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';
import { withContext } from '../db/tenant.js';

export interface AsientoAcceso {
  usuarioId: string;
  empresaId: string;
  rol: string;
  accion: string;
  metodo: string;
  ruta: string;
  recursoId: string | null;
  resultado: 'permitido' | 'denegado';
  motivo: string | null;
  ip: string | null;
}

/**
 * Escribe la bitácora de acceso a datos sensibles (`ADR-019`).
 *
 * El asiento entra por la función `registrar_acceso()` (SECURITY DEFINER) y no
 * por un INSERT normal, por dos motivos que importan:
 *
 *  1. Un acceso DENEGADO por membresía vencida ocurre justo cuando
 *     `app_current_empresa()` ya devuelve NULL, así que un INSERT bajo RLS
 *     fallaría por WITH CHECK — y se perdería el evento más interesante.
 *  2. La función toma el usuario del contexto de sesión, no de un parámetro:
 *     la capa de aplicación no puede firmar un asiento con el nombre de otro.
 */
@Injectable()
export class AuditoriaService {
  private readonly log = new Logger(AuditoriaService.name);

  constructor(@Inject(DB) private readonly handle: DbHandle) {}

  /**
   * Registra el asiento en su PROPIA transacción, deliberadamente separada de
   * la que sirve la petición: si el acceso se denegó no hay transacción de
   * negocio donde colgarse, y si se permitió no queremos que un rollback del
   * negocio borre la evidencia de que el dato ya se mostró.
   *
   * Propaga el error a quien llama. La decisión de si un fallo de bitácora
   * debe tumbar la petición es del guard, no de aquí (ver `PermisoGuard`).
   */
  async registrar(a: AsientoAcceso): Promise<void> {
    await withContext(
      this.handle.db,
      { usuarioId: a.usuarioId, empresaId: a.empresaId },
      async (tx) => {
        await tx.execute(sql`
          select registrar_acceso(
            ${a.empresaId}::uuid, ${a.rol}, ${a.accion}, ${a.metodo}, ${a.ruta},
            ${a.recursoId}, ${a.resultado}, ${a.motivo}, ${a.ip}
          )`);
      },
    );
  }

  /**
   * Registra sin propagar el fallo, para las rutas donde perder el asiento es
   * peor que devolver un error al usuario — en la práctica, los DENEGADOS: el
   * acceso ya se está rechazando y convertir un 403 en un 500 solo esconde la
   * causa real de quien lo está investigando.
   */
  async registrarSinFallar(a: AsientoAcceso): Promise<void> {
    try {
      await this.registrar(a);
    } catch (e) {
      this.log.error(
        `No se pudo registrar el acceso ${a.resultado} de ${a.usuarioId} a ${a.accion}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  /** Bitácora de la empresa activa, del más reciente hacia atrás. */
  async listar(
    ctx: { usuarioId: string; empresaId: string },
    limite = 100,
  ): Promise<readonly Record<string, unknown>[]> {
    return withContext(this.handle.db, ctx, async (tx) => {
      const filas = await tx.execute(sql`
        select id, usuario_id, rol, ocurrido_en, accion, metodo, ruta,
               recurso_id, resultado, motivo, ip
        from acceso_auditoria
        order by ocurrido_en desc
        limit ${limite}`);
      return filas as readonly Record<string, unknown>[];
    });
  }
}
