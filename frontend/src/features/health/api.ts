import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export interface Health {
  status: 'ok';
  service: string;
}

export function parseHealth(data: unknown): Health {
  if (
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    data.status === 'ok' &&
    'service' in data &&
    typeof data.service === 'string'
  ) {
    return { status: 'ok', service: data.service };
  }

  throw new Error('Respuesta inesperada de /api/health');
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async ({ signal }) => parseHealth(await apiGet('/health', signal)),
  });
}
