import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-4 py-16">
      <p className="text-sm font-semibold text-muted-foreground">404</p>
      <h2 className="text-3xl font-semibold tracking-tight">Página no encontrada</h2>
      <p className="text-muted-foreground">La dirección no existe o el módulo aún no está listo.</p>
      <Button asChild>
        <Link to="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
