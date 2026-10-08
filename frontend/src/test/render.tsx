import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
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
