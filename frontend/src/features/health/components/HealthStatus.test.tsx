import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HEALTHY, mockFetch, renderApp } from '@/test/render';

describe('HealthStatus', () => {
  it('muestra la conexión establecida cuando la API responde', async () => {
    const fetchMock = mockFetch(HEALTHY);
    renderApp();

    expect(await screen.findByText('Conexión establecida')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.anything());
  });

  it('muestra el error y permite reintentar', async () => {
    mockFetch({ status: 503, body: {} }, HEALTHY);
    renderApp();

    expect(await screen.findByText('No pudimos conectar con la API')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Conexión establecida')).toBeInTheDocument();
  });

  it('trata una respuesta con forma inesperada como error', async () => {
    mockFetch({ body: { status: 'ok' } });
    renderApp();

    expect(await screen.findByText('No pudimos conectar con la API')).toBeInTheDocument();
  });
});
