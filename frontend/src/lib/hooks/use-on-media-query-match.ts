import { useEffect } from 'react';

/**
 * Ejecuta `onMatch` cada vez que la media query pasa a cumplirse (p. ej. al rotar
 * una tableta o ampliar la ventana). `onMatch` debe ser estable (useCallback).
 */
export function useOnMediaQueryMatch(query: string, onMatch: () => void): void {
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        onMatch();
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query, onMatch]);
}
