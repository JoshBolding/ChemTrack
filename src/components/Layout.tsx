import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
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
      <header className="sticky top-0 z-10 bg-primary text-white px-4 pt-3 pb-3 shadow-sm">
        <div className="flex items-center gap-3">
          {back ? (
            <Link
              to={back}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl active:bg-white/10"
              aria-label="Back"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          ) : (
            <div className="w-2" />
          )}
          <h1 className="text-xl font-bold flex-1 truncate">{title}</h1>
          {rightSlot}
          <OfflineBadge />
        </div>
      </header>
      <main className="flex-1 px-4 py-4 pb-24 max-w-xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
