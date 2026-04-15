import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { countPendingEvents, listJobs, listTotes, listUnits } from '../db/repo';
import type { Job, Tote, Unit } from '../types';

const primaryActions: {
  to: string;
  label: string;
  sub: string;
  icon: string;
}[] = [
  {
    to: '/scan',
    label: 'Scan Tote',
    sub: 'Fastest path to action in the field',
    icon: '⌖',
  },
  {
    to: '/receive',
    label: 'Receive Shipment',
    sub: 'Create batches of new tote records',
    icon: '⊞',
  },
  {
    to: '/search',
    label: 'Find Tote',
    sub: 'Manual lookup when a label is unclear',
    icon: '⌕',
  },
];

const oversightActions: {
  to: string;
  label: string;
  sub: string;
  icon: string;
}[] = [
  {
    to: '/units',
    label: 'Units',
    sub: 'Field inventory by mini-warehouse',
    icon: '⛟',
  },
  {
    to: '/jobs',
    label: 'Jobs',
    sub: 'Active chemical context by job',
    icon: '⚙',
  },
  {
    to: '/inventory',
    label: 'Inventory',
    sub: 'See totals, location mix, and shortages',
    icon: '≡',
  },
];

export default function Home() {
  const [totes, setTotes] = useState<Tote[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    void (async () => {
      const [nextTotes, nextUnits, nextJobs, nextPending] = await Promise.all([
        listTotes(),
        listUnits(),
        listJobs(true),
        countPendingEvents(),
      ]);
      setTotes(nextTotes);
      setUnits(nextUnits);
      setJobs(nextJobs);
      setPending(nextPending);
    })();
  }, []);

  const snapshot = useMemo(() => {
    const activeTotes = totes.filter((t) => t.status !== 'discarded');
    const fieldGallons = activeTotes
      .filter((t) => t.location.kind === 'unit')
      .reduce((sum, t) => sum + t.currentQtyGal, 0);
    const yardReady = activeTotes.filter(
      (t) => t.location.kind === 'yard' && t.currentQtyGal > 0
    ).length;
    return {
      activeTotes: activeTotes.length,
      fieldGallons,
      yardReady,
      activeUnits: units.filter((u) => u.active).length,
      activeJobs: jobs.length,
    };
  }, [jobs, totes, units]);

  return (
    <Layout title="ChemTrack">
      <div className="space-y-5">
        <section className="hero-panel animate-rise-in">
          <div className="hero-orbit animate-float-soft" />
          <div className="relative z-[1]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/55">
              Field Ops Control
            </div>
            <h2 className="mt-3 max-w-[12ch] text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              ChemTrack
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/72 sm:text-base">
              Scan-first tote tracking for the yard, the units, and the job context that
              actually matters in the field.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link to="/scan" className="btn-primary">
                Open Scanner
              </Link>
              <Link
                to="/search"
                className="btn-secondary !border-white/15 !bg-white/8 !text-white hover:!bg-white/12 active:!bg-white/12"
              >
                Manual Search
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Active Totes" value={snapshot.activeTotes.toString()} />
              <Metric label="Field Gallons" value={snapshot.fieldGallons.toLocaleString()} />
              <Metric label="Yard Ready" value={snapshot.yardReady.toString()} />
              <Metric label="Units Live" value={snapshot.activeUnits.toString()} />
            </div>
          </div>
        </section>

        {pending > 0 && (
          <section className="surface-tint animate-rise-in delay-1 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="label">Queued Changes</div>
                <div className="mt-1 text-sm font-semibold text-ink">
                  {pending} change{pending === 1 ? '' : 's'} captured locally and waiting for
                  a sync path.
                </div>
              </div>
              <div className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-white">
                {pending}
              </div>
            </div>
          </section>
        )}

        <section className="animate-rise-in delay-2 space-y-3">
          <div>
            <div className="label">Primary Workflows</div>
            <p className="page-intro mt-1">
              Put the fastest field actions in reach first.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {primaryActions.map((action, index) => (
              <ActionTile key={action.to} {...action} delayClass={`delay-${index + 1}`} />
            ))}
          </div>
        </section>

        <section className="animate-rise-in delay-3 space-y-3">
          <div>
            <div className="label">Oversight</div>
            <p className="page-intro mt-1">
              Keep an eye on field inventory, jobs, and readiness across the fleet.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {oversightActions.map((action, index) => (
              <ActionTile key={action.to} {...action} delayClass={`delay-${index + 1}`} />
            ))}
          </div>
        </section>

        <section className="surface-tint animate-rise-in delay-4 px-5 py-4">
          <div className="label">Snapshot</div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-ink-soft">
            <span>{jobs.length} active jobs</span>
            <span>{units.length} total units</span>
            <span>Scan first, decide second</span>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-panel">
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">{value}</div>
    </div>
  );
}

function ActionTile({
  to,
  label,
  sub,
  icon,
  delayClass,
}: {
  to: string;
  label: string;
  sub: string;
  icon: string;
  delayClass: string;
}) {
  return (
    <Link
      to={to}
      className={`card animate-rise-in ${delayClass} group block min-h-[148px] p-5`}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-3xl leading-none text-primary">{icon}</span>
          <span className="text-lg text-ink-muted transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </div>
        <div>
          <div className="text-xl font-black tracking-[-0.03em] text-ink">{label}</div>
          <div className="mt-1 text-sm text-ink-muted">{sub}</div>
        </div>
      </div>
    </Link>
  );
}
