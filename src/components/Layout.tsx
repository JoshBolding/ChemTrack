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
      <header className="sticky top-0 z-20 px-4 pt-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-[30px] border border-white/10 bg-[#12161c]/92 px-4 py-3 text-white shadow-[0_24px_60px_rgba(18,22,28,0.24)] backdrop-blur-xl">
          {back ? (
            <Link
              to={back}
              className="flex min-h-[46px] min-w-[46px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition hover:bg-white/10 active:bg-white/10"
              aria-label="Back"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          ) : (
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
              ChemTrack
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
              Field Chemical Tracking
            </div>
            <h1 className="truncate text-xl font-black tracking-[-0.03em]">{title}</h1>
          </div>
          {rightSlot}
          <OfflineBadge />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 pb-24">
        {children}
      </main>
    </div>
  );
}
