import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type TipoDocumento } from '../lib/api';
import { Boton, Selector, Tarjeta } from '../components/ui';

const ETIQUETA_TIPO: Record<TipoDocumento, string> = {
  contrato: 'Contrato',
  cedula: 'Cédula',
  certificacion: 'Certificación',
  otro: 'Otro',
};

/** `tamano` llega como string (ADR-006: nunca number en la frontera). */
function formatoTamano(tamano: string): string {
  const bytes = Number(tamano);
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Pestaña "Documentos" de la ficha del colaborador: contratos y
 * documentación de respaldo. Contrato con el backend (en construcción):
 * `GET/POST /colaboradores/:id/documentos` (multipart, campo `archivo` +
 * `tipo`) y `DELETE .../documentos/:docId`. Descarga por navegación directa a
 * `.../documentos/:docId/descargar` — la cookie de sesión viaja sola porque
 * es same-origin, así que no hace falta pasar por `fetch` ni manejar blobs.
 */
export function DocumentosColaboradorPanel({
  colaboradorId,
  soloLectura,
}: {
  colaboradorId: string;
  soloLectura: boolean;
}) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<TipoDocumento>('contrato');
  const [archivo, setArchivo] = useState<File | null>(null);
  // Se incrementa tras cada subida exitosa para forzar el remount del <input
  // type="file">, que es un elemento no controlado y no se puede "vaciar"
  // asignando su value.
  const [inputKey, setInputKey] = useState(0);

  const documentos = useQuery({
    queryKey: ['colaborador-documentos', colaboradorId],
    queryFn: () => api.documentosColaborador(colaboradorId),
  });

  const invalidar = async () => {
    await qc.invalidateQueries({ queryKey: ['colaborador-documentos', colaboradorId] });
  };
  const subir = useMutation({
    mutationFn: () => {
      if (!archivo) throw new Error('Selecciona un archivo');
      return api.subirDocumentoColaborador(colaboradorId, archivo, tipo);
    },
    onSuccess: async () => {
      setArchivo(null);
      setInputKey((k) => k + 1);
      await invalidar();
    },
  });
  const eliminar = useMutation({
    mutationFn: (docId: string) => api.eliminarDocumentoColaborador(colaboradorId, docId),
    onSuccess: invalidar,
  });

  return (
    <Tarjeta>
      <h3 className="mb-1 font-semibold text-slate-800">Documentos</h3>
      <p className="mb-4 text-xs text-slate-500">
        Contrato firmado, cédula, certificaciones y otra documentación de respaldo del colaborador.
      </p>

      {!soloLectura && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Selector
            etiqueta="Tipo de documento"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoDocumento);
            }}
          >
            <option value="contrato">Contrato</option>
            <option value="cedula">Cédula</option>
            <option value="certificacion">Certificación</option>
            <option value="otro">Otro</option>
          </Selector>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Archivo</span>
            <input
              key={inputKey}
              type="file"
              onChange={(e) => {
                setArchivo(e.target.files?.[0] ?? null);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm shadow-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-marca-50 file:px-3 file:py-1.5 file:text-marca-700 focus:border-marca-500 focus:ring-2 focus:ring-marca-100"
            />
          </label>

          <div className="flex items-end">
            <Boton
              onClick={() => {
                subir.mutate();
              }}
              disabled={!archivo || subir.isPending}
            >
              {subir.isPending ? 'Subiendo…' : 'Subir documento'}
            </Boton>
          </div>
        </div>
      )}

      {subir.isError && <p className="mb-2 text-sm text-red-600">{subir.error.message}</p>}
      {eliminar.isError && <p className="mb-2 text-sm text-red-600">{eliminar.error.message}</p>}

      {documentos.isLoading && <p className="text-sm text-slate-500">Cargando documentos…</p>}
      {documentos.isError && (
        <p className="text-sm text-red-600">{documentos.error.message}</p>
      )}

      {documentos.data && documentos.data.length === 0 && (
        <p className="text-sm text-slate-500">Sin documentos cargados todavía.</p>
      )}

      {documentos.data && documentos.data.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-1.5">Nombre</th>
              <th className="py-1.5">Tipo</th>
              <th className="py-1.5 text-right">Tamaño</th>
              <th className="py-1.5">Subido</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {documentos.data.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 text-slate-600">{d.nombre}</td>
                <td className="py-1.5 text-xs text-slate-500">{ETIQUETA_TIPO[d.tipo]}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-500">
                  {formatoTamano(d.tamano)}
                </td>
                <td className="py-1.5 text-xs text-slate-400">
                  {new Date(d.creadoEn).toLocaleDateString('es-PA')}
                </td>
                <td className="py-1.5 text-right whitespace-nowrap">
                  <a
                    className="text-xs text-marca-600 hover:underline"
                    href={api.urlDescargaDocumentoColaborador(colaboradorId, d.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Descargar
                  </a>
                  {!soloLectura && (
                    <button
                      className="ml-3 text-xs text-red-600 hover:underline"
                      onClick={() => {
                        eliminar.mutate(d.id);
                      }}
                      disabled={eliminar.isPending}
                    >
                      Quitar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Tarjeta>
  );
}
