import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import OfflineBadge from './OfflineBadge';

interface LayoutProps {
  title: string;
  back?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
}

export default function Layout({ title, back, children, rightSlot }: LayoutProps) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-10 bg-primary text-white px-4 py-2">
        <div className="flex items-center gap-2 max-w-xl mx-auto">
          {back ? (
            <Link
              to={back}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md active:bg-white/10"
              aria-label="Back"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </Link>
          ) : (
            <div className="w-1" />
          )}
          <h1 className="text-sm font-semibold flex-1 truncate">{title}</h1>
          {rightSlot}
          <OfflineBadge />
        </div>
      </header>
      <main className="flex-1 px-4 py-3 pb-20 max-w-xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
