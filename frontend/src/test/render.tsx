import { QueryClient } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import { AppProviders } from '@/app/AppProviders';
import { routes } from '@/app/router';

/** Renderiza la aplicación completa en una ruta, con un QueryClient aislado y sin reintentos. */
export function renderApp(path = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

/** Sustituye fetch por respuestas JSON en orden; la última se repite. */
export function mockFetch(...responses: { status?: number; body: unknown }[]) {
  const fetchMock = vi.fn<typeof fetch>(() => {
    const next = responses.length > 1 ? responses.shift() : responses[0];
    const { status = 200, body } = next ?? { body: null };

    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

export const HEALTHY = { body: { status: 'ok', service: 'nomix-api' } };

type MediaListener = (event: MediaQueryListEvent) => void;

/**
 * Simula window.matchMedia (jsdom no lo implementa). Todas las consultas empiezan sin
 * cumplirse; `setMatches` cambia una y notifica a sus suscriptores como lo haría el navegador.
 */
export function mockMatchMedia() {
  const state = new Map<string, { matches: boolean; listeners: Set<MediaListener> }>();
  const entry = (query: string) => {
    let current = state.get(query);
    if (current === undefined) {
      current = { matches: false, listeners: new Set() };
      state.set(query, current);
    }
    return current;
  };

  vi.stubGlobal('matchMedia', (query: string) => {
    const current = entry(query);
    return {
      media: query,
      get matches() {
        return current.matches;
      },
      addEventListener: (_type: 'change', listener: MediaListener) =>
        current.listeners.add(listener),
      removeEventListener: (_type: 'change', listener: MediaListener) =>
        current.listeners.delete(listener),
    } as unknown as MediaQueryList;
  });

  return {
    setMatches(query: string, matches: boolean) {
      const current = entry(query);
      current.matches = matches;
      act(() => {
        for (const listener of current.listeners) {
          listener({ matches, media: query } as MediaQueryListEvent);
        }
      });
    },
    listenerCount: (query: string) => entry(query).listeners.size,
  };
}
