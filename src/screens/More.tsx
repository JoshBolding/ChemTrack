import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  ChevronRight,
  ClipboardList,
  CloudOff,
  RotateCcw,
  Search,
} from 'lucide-react';
import { countPendingEvents, listJobs, listTotes, listUnits } from '../db/repo';
import type { Job, Tote, Unit } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';
import { resetDemoData } from '../seed/seed';

export default function More() {
  const [pending, setPending] = useState(0);
  const [attentionCount, setAttentionCount] = useState(0);
  const [resetting, setResetting] = useState(false);

  async function readCounts() {
    const [pendingEvents, totes, units, jobs] = await Promise.all([
      countPendingEvents(),
      listTotes(),
      listUnits(),
      listJobs(),
    ]);
    return {
      pendingEvents,
      attentionItems: countAttention(totes, units, jobs),
    };
  }

  async function refresh() {
    const next = await readCounts();
    setPending(next.pendingEvents);
    setAttentionCount(next.attentionItems);
  }

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const next = await readCounts();
      if (!mounted) return;
      setPending(next.pendingEvents);
      setAttentionCount(next.attentionItems);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function reset() {
    const confirmed = window.confirm(
      'Reset local ChemTrack demo data? This clears local changes on this device.'
    );
    if (!confirmed) return;
    setResetting(true);
    await resetDemoData();
    await refresh();
    setResetting(false);
  }

  return (
    <Layout title="More" back="/scan" showBottomNav>
      <div className="space-y-4">
        <section className="panel p-4">
          <div className="text-2xl font-extrabold">Operations</div>
          <div className="mt-1 text-sm text-ink-muted">
            Tools for lookup, receiving, exceptions, and job context.
          </div>
        </section>

        <section className="panel divide-y divide-slate-100">
          <MenuRow
            to="/reports"
            icon={<BarChart3 size={21} />}
            title="Supervisor Report"
            detail="Inventory snapshot, unit loadout, and job usage"
          />
          <MenuRow
            to="/search"
            icon={<Search size={21} />}
            title="Search Tote"
            detail="Manual lookup by ID, product, or status"
          />
          <MenuRow
            to="/receive"
            icon={<ClipboardList size={21} />}
            title="Receive Shipment"
            detail="Create a batch of new tote records"
          />
          <MenuRow
            to="/attention"
            icon={<AlertTriangle size={21} />}
            title="Needs Attention"
            detail="Review holds, bad references, quantity issues, and sync problems"
            badge={attentionCount}
            badgeTone={attentionCount > 0 ? 'warn' : 'ok'}
          />
          <MenuRow
            to="/jobs"
            icon={<Briefcase size={21} />}
            title="Jobs"
            detail="Active job context and chemical attribution"
          />
        </section>

        <section className="panel divide-y divide-slate-100">
          <MenuRow
            to="/attention"
            icon={<CloudOff size={21} />}
            title="Pending Sync"
            detail="Local changes waiting to sync"
            badge={pending}
            badgeTone={pending > 0 ? 'warn' : 'ok'}
          />
          <ButtonRow
            icon={<RotateCcw size={21} />}
            title="Reset Demo Data"
            detail="Clear local IndexedDB and reload the demo sample snapshot"
            onClick={reset}
            disabled={resetting}
          />
        </section>
      </div>
    </Layout>
  );
}

function ButtonRow({
  icon,
  title,
  detail,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 p-4 text-left active:bg-surface-sunken disabled:opacity-60"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-action">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-extrabold">{disabled ? 'Resetting...' : title}</div>
        <div className="mt-0.5 text-sm text-ink-muted">{detail}</div>
      </div>
    </button>
  );
}

function MenuRow({
  to,
  icon,
  title,
  detail,
  badge,
  badgeTone = 'ok',
  disabled = false,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  detail: string;
  badge?: number;
  badgeTone?: 'ok' | 'warn';
  disabled?: boolean;
}) {
  const content = (
    <>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          disabled ? 'bg-slate-100 text-ink-muted' : 'bg-surface-sunken text-action'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-extrabold">{title}</div>
        <div className="mt-0.5 text-sm text-ink-muted">{detail}</div>
      </div>
      {typeof badge === 'number' && (
        <span
          className={`rounded px-2 py-1 text-xs font-extrabold ${
            badgeTone === 'warn'
              ? 'bg-amber-100 text-amber-900'
              : 'bg-emerald-50 text-emerald-800'
          }`}
        >
          {badge}
        </span>
      )}
      <ChevronRight size={18} className="text-ink-muted" />
    </>
  );

  if (disabled) {
    return <div className="flex items-center gap-3 p-4 opacity-70">{content}</div>;
  }

  return (
    <Link to={to} className="flex items-center gap-3 p-4 active:bg-surface-sunken">
      {content}
    </Link>
  );
}

function countAttention(totes: Tote[], units: Unit[], jobs: Job[]) {
  const unitById = new Map(units.map((u) => [u.id, u]));
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  let count = 0;

  for (const tote of totes) {
    if (tote.currentQtyGal < 0 || tote.currentQtyGal > TOTE_CAPACITY_GAL) count++;
    if (tote.syncState === 'pending' || tote.syncState === 'error') count++;
    if (tote.status === 'hold' || tote.location.kind === 'hold') count++;
    if (tote.location.kind === 'unit' && tote.location.unitId) {
      const unit = unitById.get(tote.location.unitId);
      if (!unit || !unit.active) count++;
    }
    if (tote.jobId) {
      const job = jobById.get(tote.jobId);
      if (!job || !job.active) count++;
    }
  }

  return count;
}
