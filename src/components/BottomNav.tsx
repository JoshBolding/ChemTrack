import { Link, useLocation } from 'react-router-dom';
import { Boxes, Ellipsis, QrCode, Truck } from 'lucide-react';

const items = [
  { to: '/scan', label: 'Scan', icon: QrCode, match: (p: string) => p === '/scan' || p === '/' },
  { to: '/inventory', label: 'Inventory', icon: Boxes, match: (p: string) => p.startsWith('/inventory') },
  { to: '/units', label: 'Units', icon: Truck, match: (p: string) => p.startsWith('/units') },
  { to: '/more', label: 'More', icon: Ellipsis, match: (p: string) => p.startsWith('/more') || p.startsWith('/jobs') || p.startsWith('/search') || p.startsWith('/receive') || p.startsWith('/attention') || p.startsWith('/reports') },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid h-[72px] max-w-xl grid-cols-4 px-2 pb-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold ${
                active ? 'text-primary' : 'text-ink-muted'
              }`}
            >
              <Icon size={23} strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
