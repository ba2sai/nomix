import { X } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router';
import { Button } from '@/components/ui/button';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <div className="min-h-svh md:grid md:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-svh border-r bg-sidebar text-sidebar-foreground md:block">
        <Sidebar />
      </aside>

      {/* Menú móvil: panel lateral sobre el contenido; solo existe mientras está abierto. */}
      {menuOpen && (
        <div className="fixed inset-0 z-20 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={closeMenu} aria-hidden="true" />
          <aside
            aria-label="Menú"
            className="absolute inset-y-0 left-0 w-64 border-r bg-sidebar text-sidebar-foreground shadow-lg"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3"
              onClick={closeMenu}
              aria-label="Cerrar menú"
            >
              <X aria-hidden="true" />
            </Button>
            <Sidebar onNavigate={closeMenu} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <Header
          onOpenMenu={() => {
            setMenuOpen(true);
          }}
        />
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
