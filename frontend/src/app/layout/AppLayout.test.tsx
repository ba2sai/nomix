import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { HEALTHY, mockFetch, renderApp } from '@/test/render';

describe('AppLayout', () => {
  beforeEach(() => {
    mockFetch(HEALTHY);
  });

  it('muestra sidebar, header con el título y el contenido de la ruta', async () => {
    renderApp();

    const [nav] = screen.getAllByRole('navigation', { name: 'Principal' });
    expect(nav).toBeDefined();
    expect(within(nav as HTMLElement).getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Inicio' })).toBeInTheDocument();
    expect(await screen.findByText('Conexión establecida')).toBeInTheDocument();
  });

  it('marca como no disponibles los módulos que aún no existen', () => {
    renderApp();

    const [nav] = screen.getAllByRole('navigation', { name: 'Principal' });
    const planillas = within(nav as HTMLElement).getByText('Planillas');
    expect(planillas).toHaveAttribute('aria-disabled', 'true');
    expect(within(nav as HTMLElement).queryByRole('link', { name: /Planillas/ })).toBeNull();
  });

  it('muestra la página 404 en rutas desconocidas', () => {
    renderApp('/no-existe');

    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'No encontrada' })).toBeInTheDocument();
  });

  it('abre y cierra el menú móvil', async () => {
    renderApp();
    const user = userEvent.setup();

    expect(screen.queryByRole('complementary', { name: 'Menú' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(screen.getByRole('complementary', { name: 'Menú' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cerrar menú' }));
    expect(screen.queryByRole('complementary', { name: 'Menú' })).toBeNull();
  });
});
