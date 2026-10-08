import { Menu } from 'lucide-react';
import { useMatches } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '../theme/ThemeToggle';

/** Las rutas declaran su título en `handle.title` (ver router.tsx). */
function usePageTitle(): string {
  const matches = useMatches();

  for (const match of [...matches].reverse()) {
    const handle = match.handle;
    if (typeof handle === 'object' && handle !== null && 'title' in handle) {
      return String(handle.title);
    }
  }

  return 'Nomix';
}

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const title = usePageTitle();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMenu}
        aria-label="Abrir menú"
      >
        <Menu aria-hidden="true" />
      </Button>
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="secondary">Desarrollo</Badge>
        <ThemeToggle />
      </div>
    </header>
  );
}
