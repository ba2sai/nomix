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

  describe('menú móvil', () => {
    it('lleva el foco al panel, lo contiene y deja inerte el fondo', async () => {
      renderApp();
      const user = userEvent.setup();

      expect(screen.queryByRole('dialog', { name: 'Menú' })).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Abrir menú' }));

      const dialog = screen.getByRole('dialog', { name: 'Menú' });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);

      // Más tabulaciones que elementos enfocables: el foco nunca sale del panel.
      for (let i = 0; i < 8; i++) {
        await user.tab();
        expect(dialog).toContainElement(document.activeElement as HTMLElement);
      }
      for (let i = 0; i < 3; i++) {
        await user.tab({ shift: true });
        expect(dialog).toContainElement(document.activeElement as HTMLElement);
      }

      // El contenido de fondo queda fuera del árbol de accesibilidad.
      expect(screen.queryByRole('button', { name: 'Activar modo oscuro' })).toBeNull();
    });

    it('cierra con Escape y devuelve el foco al botón que lo abrió', async () => {
      renderApp();
      const user = userEvent.setup();
      const trigger = screen.getByRole('button', { name: 'Abrir menú' });

      await user.click(trigger);
      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog', { name: 'Menú' })).toBeNull();
      expect(trigger).toHaveFocus();
    });

    it('cierra con el botón Cerrar y devuelve el foco', async () => {
      renderApp();
      const user = userEvent.setup();
      const trigger = screen.getByRole('button', { name: 'Abrir menú' });

      await user.click(trigger);
      await user.click(screen.getByRole('button', { name: 'Cerrar menú' }));

      expect(screen.queryByRole('dialog', { name: 'Menú' })).toBeNull();
      expect(trigger).toHaveFocus();
    });

    it('se abre con el teclado y se cierra al navegar', async () => {
      renderApp('/no-existe');
      const user = userEvent.setup();

      screen.getByRole('button', { name: 'Abrir menú' }).focus();
      await user.keyboard('{Enter}');
      const dialog = screen.getByRole('dialog', { name: 'Menú' });
      await user.click(within(dialog).getByRole('link', { name: 'Inicio' }));

      expect(screen.queryByRole('dialog', { name: 'Menú' })).toBeNull();
      expect(screen.getByRole('heading', { level: 1, name: 'Inicio' })).toBeInTheDocument();
    });
  });
});
