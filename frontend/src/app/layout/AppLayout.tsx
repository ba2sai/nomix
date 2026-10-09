import { useCallback, useState } from 'react';
import { Outlet } from 'react-router';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useOnMediaQueryMatch } from '@/lib/hooks/use-on-media-query-match';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

/** Breakpoint `md` de Tailwind: desde aquí la sidebar es fija y no hay menú móvil. */
export const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  // Al pasar a escritorio con el menú abierto (p. ej. rotar una tableta), el diálogo se
  // cierra de verdad: ocultarlo con CSS dejaría el fondo bloqueado e inaccesible.
  useOnMediaQueryMatch(DESKTOP_MEDIA_QUERY, closeMenu);

  return (
    <div className="min-h-svh md:grid md:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-svh border-r bg-sidebar text-sidebar-foreground md:block">
        <Sidebar />
      </aside>

      {/* Menú móvil: diálogo modal con foco contenido; ver components/ui/sheet.tsx. */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          closeLabel="Cerrar menú"
          overlayClassName="md:hidden"
          aria-describedby={undefined}
          className="bg-sidebar text-sidebar-foreground md:hidden"
        >
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <Sidebar onNavigate={closeMenu} />
        </SheetContent>

        <div className="flex min-w-0 flex-col">
          <Header />
          <main className="flex-1 p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </Sheet>
    </div>
  );
}
