import { useEffect, useRef } from 'react';
import type { PlanillaLinea } from '../lib/api';

/**
 * Inspection Drawer — "¿por qué esta cifra?" (`ADR-005`).
 *
 * Toda línea de planilla persiste QUÉ regla la produjo: base, tasa, resultado
 * y artículo legal. Ese rastro existía desde el principio en `planilla_traza`
 * pero no se veía en ninguna pantalla, así que en la práctica el usuario tenía
 * que creerse el número. Este panel lo abre.
 *
 * No es un adorno de transparencia: es la diferencia entre discutir con la CSS
 * citando el artículo aplicado y discutir diciendo "lo calculó el sistema".
 *
 * Cuando una línea NO tiene traza se dice con esas palabras, en vez de dejar
 * el panel vacío como si no hubiera nada que explicar.
 */
export function InspectionDrawer({
  linea,
  colaborador,
  onCerrar,
}: {
  linea: PlanillaLinea | null;
  colaborador: string;
  onCerrar: () => void;
}) {
  const cerrarRef = useRef<HTMLButtonElement>(null);

  // Escape cierra, y el foco entra al panel: quien navega con teclado no queda
  // atrapado detrás de un overlay que no puede ver.
  useEffect(() => {
    if (!linea) return;
    cerrarRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCerrar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [linea, onCerrar]);

  if (!linea) return null;
  const t = linea.traza;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true"
         aria-label={`Detalle del cálculo de ${linea.concepto}`}>
      <button
        className="flex-1 bg-slate-900/20"
        onClick={onCerrar}
        aria-label="Cerrar panel"
        tabIndex={-1}
      />
      <aside className="flex w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-xs uppercase tracking-wide text-slate-400">{colaborador}</p>
            <h2 className="truncate text-lg font-semibold text-slate-800">{linea.concepto}</h2>
          </div>
          <button
            ref={cerrarRef}
            onClick={onCerrar}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <div className="space-y-5 px-5 py-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Monto</p>
            <p className="font-mono text-2xl font-semibold text-slate-900">{linea.monto}</p>
            <p className="mt-0.5 text-xs text-slate-500">{linea.tipo}</p>
          </div>

          {t ? (
            <>
              <Seccion titulo="Cómo se llegó ahí">
                {/* La aritmética explícita: base × tasa = resultado. Que el
                    usuario pueda rehacer la cuenta a mano es el punto. */}
                <Fila k="Base aplicada" v={t.baseAplicada ?? '—'} mono />
                <Fila k="Tasa aplicada" v={t.tasaAplicada ?? '—'} mono />
                <Fila k="Resultado" v={t.resultado ?? '—'} mono />
                {linea.cantidad && <Fila k="Cantidad" v={linea.cantidad} mono />}
              </Seccion>

              <Seccion titulo="Con qué autoridad">
                <Fila k="Regla" v={t.reglaCodigo} mono />
                <Fila k="Base legal" v={t.articuloLegal ?? 'No registrada'} />
              </Seccion>

              <Seccion titulo="Cuándo">
                {/*
                  La fecha del cálculo importa porque las reglas se resuelven
                  por la fecha del PERÍODO (ADR-001): si esta línea se recalcula
                  tras un cambio normativo, este sello es lo que distingue el
                  resultado viejo del nuevo.
                */}
                <Fila k="Calculado" v={new Date(t.calculadoEn).toLocaleString('es-PA')} />
              </Seccion>
            </>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-medium">Esta línea no dejó rastro.</p>
              <p className="mt-1 text-amber-700">
                El monto está, pero no se guardó qué regla lo produjo, así que no se puede
                justificar ante un tercero. Es un defecto del cálculo, no una limitación de
                esta pantalla.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</h3>
      <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">{children}</dl>
    </section>
  );
}

function Fila({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-2">
      <dt className="shrink-0 text-sm text-slate-500">{k}</dt>
      <dd className={`min-w-0 break-words text-right text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>
        {v}
      </dd>
    </div>
  );
}
