import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';
import { NAVIGATION } from './navigation';

const itemClass =
  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <NavLink
        to="/"
        onClick={onNavigate}
        className="px-3 text-3xl font-bold tracking-tighter"
        aria-label="Nomix, inicio"
      >
        nomix
      </NavLink>

      <nav aria-label="Principal" className="flex flex-col gap-1">
        {NAVIGATION.map(({ label, icon: Icon, to }) =>
          to ? (
            <NavLink
              key={label}
              to={to}
              end
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  itemClass,
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <Icon aria-hidden="true" />
              {label}
            </NavLink>
          ) : (
            <span
              key={label}
              aria-disabled="true"
              className={cn(itemClass, 'cursor-not-allowed text-muted-foreground')}
            >
              <Icon aria-hidden="true" />
              {label}
              <span className="ml-auto text-[10px] tracking-wider uppercase">Pronto</span>
            </span>
          ),
        )}
      </nav>

      <p className="mt-auto px-3 text-xs text-muted-foreground">Nómina inteligente · Panamá</p>
    </div>
  );
}
