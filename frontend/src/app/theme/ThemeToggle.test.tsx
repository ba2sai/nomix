import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { HEALTHY, mockFetch, renderApp } from '@/test/render';
import { THEME_STORAGE_KEY } from './theme-context';

describe('modo claro y oscuro', () => {
  beforeEach(() => {
    mockFetch(HEALTHY);
  });

  it('alterna el tema, aplica la clase dark y lo recuerda', async () => {
    renderApp();
    const user = userEvent.setup();

    expect(document.documentElement).not.toHaveClass('dark');
    await user.click(screen.getByRole('button', { name: 'Activar modo oscuro' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Activar modo claro' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('respeta el tema guardado al iniciar', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderApp();

    expect(document.documentElement).toHaveClass('dark');
    expect(screen.getByRole('button', { name: 'Activar modo claro' })).toBeInTheDocument();
  });
});
