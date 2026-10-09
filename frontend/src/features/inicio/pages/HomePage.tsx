import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HealthStatus } from '@/features/health/components/HealthStatus';

export function HomePage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="py-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
          NÓMINA INTELIGENTE · PANAMÁ
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          Todo empieza con una buena base.
        </h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Estamos preparando un espacio para gestionar tu nómina con claridad y confianza.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Estado del servicio</CardTitle>
          <CardDescription>Conexión entre esta aplicación y la API de Nomix.</CardDescription>
        </CardHeader>
        <CardContent>
          <HealthStatus />
        </CardContent>
      </Card>
    </div>
  );
}
