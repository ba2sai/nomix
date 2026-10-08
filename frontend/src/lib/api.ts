const DEFAULT_TIMEOUT_MS = 5000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * GET a la API de Nomix. Las rutas son relativas a /api, que Vite reenvía al backend.
 * Devuelve el JSON sin tipar: cada feature valida la forma de su respuesta.
 */
export async function apiGet(path: string, signal?: AbortSignal): Promise<unknown> {
  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const response = await fetch(`/api${path}`, {
    headers: { Accept: 'application/json' },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });

  if (!response.ok) {
    throw new ApiError(`La API respondió ${String(response.status)}`, response.status);
  }

  return response.json();
}
