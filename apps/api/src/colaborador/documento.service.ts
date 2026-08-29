import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { schema } from '@nomix/db';
import { DB } from '../db/db.module.js';
import type { DbHandle } from '../db/client.js';
import { withContext, type TenantTx } from '../db/tenant.js';
import { loadEnv } from '../config/env.js';

interface Ctx {
  usuarioId: string;
  empresaId: string;
}

export const TIPOS_DOCUMENTO = ['contrato', 'cedula', 'certificacion', 'otro'] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

/**
 * Tipos aceptados. Lista blanca y no negra: enumerar lo prohibido siempre deja
 * fuera algo, y aquí el coste de equivocarse es guardar un ejecutable que
 * alguien descargará confiando en que es un contrato.
 */
const MIMES_PERMITIDOS = new Map<string, string>([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['application/msword', 'doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
]);

/** 15 MB. Un contrato escaneado cabe de sobra; un vídeo, no. */
export const TAMANO_MAXIMO = 15 * 1024 * 1024;

export interface ArchivoSubido {
  nombre: string;
  mime: string;
  contenido: Buffer;
}

/**
 * Documentos del colaborador (`ADR-022`).
 *
 * El archivo vive en disco y la fila lo describe. Tres decisiones de seguridad
 * que no son opcionales cuando lo que se guarda son contratos laborales:
 *
 *  1. **El nombre en disco es el UUID de la fila**, nunca el que subió el
 *     usuario. Un nombre de usuario usado como ruta es una travesía de
 *     directorios esperando a ocurrir, y además dos "contrato.pdf" se pisarían.
 *  2. **La ruta se construye y se verifica**: se comprueba que el resultado
 *     caiga dentro del directorio de almacén antes de tocar el disco.
 *  3. **La descarga pasa siempre por la API**, que aplica RLS y deja rastro. Un
 *     servidor de estáticos apuntando a esta carpeta serviría el contrato de
 *     cualquier empresa a quien adivinara un UUID.
 */
@Injectable()
export class DocumentoService {
  private readonly raiz: string;

  constructor(@Inject(DB) private readonly handle: DbHandle) {
    this.raiz = resolve(loadEnv().DOCUMENTOS_DIR);
  }

  /**
   * Ruta del archivo, siempre bajo la raíz del almacén y segmentada por
   * empresa. La segmentación no es el control de acceso —ese es el RLS— pero
   * hace que un descuido de permisos del sistema de archivos no exponga a
   * todas las empresas a la vez, y que borrar un inquilino sea borrar una
   * carpeta.
   */
  private rutaDe(empresaId: string, documentoId: string): string {
    const ruta = resolve(join(this.raiz, empresaId, documentoId));
    // Cinturón y tirantes: empresaId y documentoId ya vienen validados como
    // UUID por Zod y por el RLS, pero una ruta que se escapa de su raíz es un
    // fallo tan caro que se comprueba igual.
    if (!ruta.startsWith(this.raiz)) {
      throw new BadRequestException('Ruta de documento inválida');
    }
    return ruta;
  }

  async listar(ctx: Ctx, colaboradorId: string): Promise<unknown> {
    return withContext(this.handle.db, ctx, async (tx) => {
      await this.exigirColaborador(tx, colaboradorId);
      return tx
        .select({
          id: schema.documentoColaborador.id,
          tipo: schema.documentoColaborador.tipo,
          nombre: schema.documentoColaborador.nombre,
          mime: schema.documentoColaborador.mime,
          tamano: schema.documentoColaborador.tamano,
          creadoEn: schema.documentoColaborador.creadoEn,
        })
        .from(schema.documentoColaborador)
        .where(eq(schema.documentoColaborador.colaboradorId, colaboradorId))
        .orderBy(desc(schema.documentoColaborador.creadoEn));
    });
  }

  async guardar(
    ctx: Ctx,
    colaboradorId: string,
    tipo: TipoDocumento,
    archivo: ArchivoSubido,
  ): Promise<unknown> {
    if (!MIMES_PERMITIDOS.has(archivo.mime)) {
      throw new BadRequestException(
        `Tipo de archivo no admitido (${archivo.mime}). Se aceptan PDF, JPG, PNG y Word.`,
      );
    }
    if (archivo.contenido.length === 0) {
      throw new BadRequestException('El archivo está vacío.');
    }
    if (archivo.contenido.length > TAMANO_MAXIMO) {
      throw new BadRequestException('El archivo supera los 15 MB.');
    }

    const id = randomUUID();
    const hash = createHash('sha256').update(archivo.contenido).digest('hex');

    return withContext(this.handle.db, ctx, async (tx) => {
      await this.exigirColaborador(tx, colaboradorId);

      // El archivo se escribe ANTES de confirmar la fila: si la escritura en
      // disco falla, la transacción no llega a confirmarse y no queda un
      // registro apuntando a un archivo que no existe. El caso contrario —un
      // archivo huérfano si la transacción falla después— es recuperable y
      // barato; el inverso deja la ficha mintiendo.
      const ruta = this.rutaDe(ctx.empresaId, id);
      await mkdir(join(this.raiz, ctx.empresaId), { recursive: true });
      await writeFile(ruta, archivo.contenido, { mode: 0o600 });

      const [f] = await tx
        .insert(schema.documentoColaborador)
        .values({
          id,
          empresaId: ctx.empresaId,
          colaboradorId,
          tipo,
          nombre: archivo.nombre.slice(0, 255),
          mime: archivo.mime,
          tamano: String(archivo.contenido.length),
          hash,
          creadoPor: ctx.usuarioId,
        })
        .returning();
      return {
        id: f!.id,
        tipo: f!.tipo,
        nombre: f!.nombre,
        mime: f!.mime,
        tamano: f!.tamano,
        creadoEn: f!.creadoEn,
      };
    });
  }

  /**
   * Devuelve el contenido para descargar. La fila se lee bajo RLS, así que un
   * documento de otra empresa simplemente no existe para esta sesión — y el id
   * es un UUID, no un correlativo que se pueda recorrer.
   */
  async descargar(
    ctx: Ctx,
    colaboradorId: string,
    documentoId: string,
  ): Promise<{ nombre: string; mime: string; contenido: Buffer }> {
    const meta = await withContext(this.handle.db, ctx, async (tx) => {
      const [f] = await tx
        .select()
        .from(schema.documentoColaborador)
        .where(
          and(
            eq(schema.documentoColaborador.id, documentoId),
            eq(schema.documentoColaborador.colaboradorId, colaboradorId),
          ),
        );
      if (!f) throw new NotFoundException('Documento no encontrado');
      return f;
    });

    let contenido: Buffer;
    try {
      contenido = await readFile(this.rutaDe(meta.empresaId, meta.id));
    } catch {
      // La fila existe y el archivo no: es un fallo de infraestructura, no un
      // 404 del usuario. Decirlo con estas palabras ahorra media hora de
      // buscar el documento en la interfaz.
      throw new NotFoundException(
        'El registro del documento existe pero su archivo no está en el almacén. ' +
          'Es un problema del servidor, no un documento borrado.',
      );
    }
    return { nombre: meta.nombre, mime: meta.mime, contenido };
  }

  /**
   * Borra fila y archivo. Aquí sí se borra de verdad —a diferencia de los
   * conceptos fijos, que se cierran con fecha— porque un documento no
   * participa de ningún cálculo pasado: nada se recalcula distinto por su
   * ausencia. Y una subida equivocada de un documento personal debe poder
   * deshacerse, no solo ocultarse.
   */
  async eliminar(ctx: Ctx, colaboradorId: string, documentoId: string): Promise<{ ok: true }> {
    const meta = await withContext(this.handle.db, ctx, async (tx) => {
      const [f] = await tx
        .delete(schema.documentoColaborador)
        .where(
          and(
            eq(schema.documentoColaborador.id, documentoId),
            eq(schema.documentoColaborador.colaboradorId, colaboradorId),
          ),
        )
        .returning();
      if (!f) throw new NotFoundException('Documento no encontrado');
      return f;
    });
    // Si el archivo ya no estaba, la fila igual quedó borrada: el objetivo era
    // que dejara de existir y se cumplió.
    await unlink(this.rutaDe(meta.empresaId, meta.id)).catch(() => undefined);
    return { ok: true };
  }

  private async exigirColaborador(tx: TenantTx, colaboradorId: string): Promise<void> {
    const [c] = await tx
      .select({ id: schema.colaborador.id })
      .from(schema.colaborador)
      .where(eq(schema.colaborador.id, colaboradorId));
    if (!c) throw new NotFoundException('Colaborador no encontrado');
  }
}
