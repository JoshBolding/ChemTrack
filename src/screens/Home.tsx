import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import Layout from '../components/Layout';
import ChemTrackMark from '../components/ChemTrackMark';
import { resetDemoData } from '../seed/seed';
import { listTotes } from '../db/repo';
import { isPartial } from '../lib/status';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ClipboardList,
  QrCode,
  RotateCcw,
  Search,
  Truck,
} from 'lucide-react';

const tiles: {
  to: string;
  label: string;
  sub: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  tone: string;
}[] = [
  {
    to: '/scan',
    label: 'Scan Tote',
    sub: 'Most common action',
    icon: QrCode,
    tone: 'bg-primary text-white',
  },
  {
    to: '/receive',
    label: 'Receive Shipment',
    sub: 'Create new totes',
    icon: ClipboardList,
    tone: 'bg-white text-ink border border-slate-200',
  },
  {
    to: '/units',
    label: 'Units',
    sub: 'Mini-warehouses',
    icon: Truck,
    tone: 'bg-white text-ink border border-slate-200',
  },
  {
    to: '/reports',
    label: 'Supervisor',
    sub: 'Reports and usage',
    icon: BarChart3,
    tone: 'bg-white text-ink border border-slate-200',
  },
  {
    to: '/attention',
    label: 'Attention',
    sub: 'Exceptions',
    icon: AlertTriangle,
    tone: 'bg-white text-ink border border-slate-200',
  },
  {
    to: '/inventory',
    label: 'Inventory',
    sub: 'Totals by product',
    icon: Boxes,
    tone: 'bg-white text-ink border border-slate-200',
  },
  {
    to: '/search',
    label: 'Search Tote',
    sub: 'Manual lookup',
    icon: Search,
    tone: 'bg-white text-ink border border-slate-200',
  },
];

export default function Home() {
  const [summary, setSummary] = useState({
    totes: 0,
    gallons: 0,
    partials: 0,
    onUnits: 0,
  });
  const [resetting, setResetting] = useState(false);

  async function readSummary() {
    const totes = (await listTotes()).filter((tote) => tote.status !== 'discarded');
    return {
      totes: totes.length,
      gallons: totes.reduce((sum, tote) => sum + tote.currentQtyGal, 0),
      partials: totes.filter(isPartial).length,
      onUnits: totes.filter((tote) => tote.location.kind === 'unit').length,
    };
  }

  async function refreshSummary() {
    setSummary(await readSummary());
  }

  async function reset() {
    const confirmed = window.confirm(
      'Reset local ChemTrack demo data? This clears local changes on this device.'
    );
    if (!confirmed) return;
    setResetting(true);
    await resetDemoData();
    await refreshSummary();
    setResetting(false);
  }

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const next = await readSummary();
      if (mounted) setSummary(next);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Layout title="ChemTrack" showBottomNav>
      <div className="space-y-2.5">
        <section className="panel overflow-hidden">
          <div className="bg-chrome p-3 text-white">
            <div className="flex items-center gap-3">
              <ChemTrackMark className="h-9 w-9 shrink-0 rounded-md shadow-none" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-red-200">
                  Coil Tubing Operations
                </div>
                <div className="truncate text-2xl font-extrabold tracking-tight">
                  ChemTrack
                </div>
                <p className="truncate text-xs font-medium text-white/70">
                  Scan, locate, update, report.
                </p>
              </div>
              <button
                type="button"
                className="flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-md border border-white/15 px-2.5 text-[10px] font-extrabold uppercase tracking-wide text-white active:bg-white/10"
                onClick={reset}
                disabled={resetting}
              >
                <RotateCcw size={13} />
                {resetting ? 'Resetting' : 'Reset'}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link to="/scan" className="btn-primary">
                <QrCode size={18} />
                Start Demo
              </Link>
              <Link to="/reports" className="btn-secondary border-white/20 bg-white/10 text-white active:bg-white/15">
                <BarChart3 size={18} />
                Supervisor
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-4 divide-x divide-slate-200 bg-white">
            <Summary label="Totes" value={summary.totes.toString()} />
            <Summary label="Gallons" value={summary.gallons.toLocaleString()} />
            <Summary label="On Units" value={summary.onUnits.toString()} />
            <Summary label="Partial" value={summary.partials.toString()} />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Link to="/scan" className="btn-action min-h-[50px] px-3 text-xs">
            Manual Scan
          </Link>
          <Link to="/tote/RH-250414-007" className="btn-secondary min-h-[50px] px-3 font-mono text-xs">
            RH-250414-007
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex min-h-[68px] items-center gap-3 rounded-lg p-3 shadow-sm transition active:scale-[0.98] ${t.tone}`}
              >
                <Icon size={23} strokeWidth={2.2} className="shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold leading-tight">{t.label}</div>
                  <div className="mt-0.5 truncate text-[11px] font-semibold opacity-75">{t.sub}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-1 py-2 text-center">
      <div className="text-base font-extrabold leading-tight text-ink">{value}</div>
      <div className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wide text-ink-muted">
        {label}
      </div>
    </div>
  );
}
