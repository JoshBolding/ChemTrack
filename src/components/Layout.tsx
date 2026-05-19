import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import BottomNav from './BottomNav';

interface LayoutProps {
  title: string;
  back?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  showBottomNav?: boolean;
  dark?: boolean;
}

export default function Layout({
  title,
  back,
  children,
  rightSlot,
  showBottomNav = false,
  dark = true,
}: LayoutProps) {
  return (
    <div className="min-h-full bg-surface-alt">
      <header
        className={`sticky top-0 z-10 px-4 pb-3 pt-3 shadow-sm ${
          dark ? 'bg-chrome text-white' : 'bg-white text-ink'
        }`}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {back ? (
            <Link
              to={back}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg ${
                dark ? 'active:bg-white/10' : 'active:bg-surface-sunken'
              }`}
              aria-label="Back"
            >
              <ArrowLeft size={24} strokeWidth={2.4} />
            </Link>
          ) : (
            <div className="min-h-[44px] min-w-[44px]" />
          )}
          <h1 className="flex-1 truncate text-center text-base font-extrabold">
            {title}
          </h1>
          <div className="flex min-h-[44px] min-w-[44px] items-center justify-end">
            {rightSlot}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-4 py-4 pb-24">
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
