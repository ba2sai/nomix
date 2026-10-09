import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHealth } from '../api';

const STATES = {
  pending: { label: 'Comprobando conexión…', dot: 'bg-warning' },
  success: { label: 'Conexión establecida', dot: 'bg-success' },
  error: { label: 'No pudimos conectar con la API', dot: 'bg-destructive' },
} as const;

export function HealthStatus() {
  const { status, refetch, isFetching } = useHealth();
  const state = STATES[status];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="outline" role="status" className="px-3 py-1 text-sm">
        <span aria-hidden="true" className={cn('size-2 rounded-full', state.dot)} />
        {state.label}
      </Badge>
      {status === 'error' && (
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw aria-hidden="true" className={cn(isFetching && 'animate-spin')} />
          Reintentar
        </Button>
      )}
    </div>
  );
}
