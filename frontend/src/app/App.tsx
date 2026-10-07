import { useEffect, useState } from 'react';

export function App() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let active = true;
    fetch('/api/health', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Servicio no disponible');
        const result: unknown = await response.json();
        if (!result || typeof result !== 'object' || !('status' in result) || result.status !== 'ok') {
          throw new Error('Respuesta inesperada');
        }
        if (active) setStatus('ready');
      })
      .catch(() => { if (active) setStatus('error'); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, []);

  return (
    <main>
      <a className="brand" href="/" aria-label="Nomix, inicio">nomix</a>
      <section aria-labelledby="title">
        <p className="eyebrow">NÓMINA INTELIGENTE · PANAMÁ</p>
        <h1 id="title">Todo empieza<br />con una buena base.</h1>
        <p className="description">Estamos preparando un espacio para gestionar tu nómina con claridad y confianza.</p>
        <p className={`status ${status}`} role="status">
          <span aria-hidden="true" />
          {status === 'loading' ? 'Comprobando conexión…' : status === 'ready' ? 'Conexión establecida' : 'No pudimos conectar. Recarga para intentarlo de nuevo.'}
        </p>
      </section>
      <footer>Nomix <span>Entorno de desarrollo</span></footer>
    </main>
  );
}
