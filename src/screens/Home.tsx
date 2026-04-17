import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  QrCode,
  Truck,
  Wrench,
  Package,
  Search,
  PackagePlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Layout from '../components/Layout';
import { listTotes } from '../db/repo';
import type { Tote } from '../types';
import { isPartial } from '../lib/status';

export default function Home() {
  const [totes, setTotes] = useState<Tote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setTotes(await listTotes());
      setLoading(false);
    })();
  }, []);

  const active = totes.filter((t) => t.status !== 'discarded');
  const inYard = active.filter((t) => t.status === 'in_yard');
  const onUnit = active.filter((t) => t.status === 'assigned_to_unit');
  const empty = active.filter((t) => t.status === 'empty');
  const onHold = active.filter((t) => t.status === 'hold');
  const partials = active.filter((t) => isPartial(t));
  const syncErrors = totes.filter((t) => t.syncState === 'error');
  const totalGal = active.reduce((s, t) => s + t.currentQtyGal, 0);

  const attention: { dot: string; label: string }[] = [];
  if (onHold.length > 0)
    attention.push({
      dot: 'bg-amber-500',
      label: `${onHold.length} tote${onHold.length > 1 ? 's' : ''} on hold`,
    });
  if (syncErrors.length > 0)
    attention.push({
      dot: 'bg-red-500',
      label: `${syncErrors.length} sync error${syncErrors.length > 1 ? 's' : ''}`,
    });
  if (partials.length > 0)
    attention.push({
      dot: 'bg-yellow-500',
      label: `${partials.length} partial tote${partials.length > 1 ? 's' : ''}`,
    });
  if (empty.length > 0)
    attention.push({
      dot: 'bg-slate-400',
      label: `${empty.length} empty, awaiting discard`,
    });

  return (
    <Layout title="ChemTrack">
      <div className="space-y-3">
        <Link to="/scan" className="btn-primary w-full gap-2">
          <QrCode size={18} />
          Scan Tote
        </Link>

        {attention.length > 0 && (
          <div className="card divide-y divide-slate-100">
            <div className="px-3 py-2">
              <span className="label">Attention</span>
            </div>
            {attention.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-3 py-2"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`}
                />
                <span className="text-sm text-ink">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="card px-3 py-2.5">
            <div className="text-xs text-ink-muted">
              {active.length} active totes &middot;{' '}
              {totalGal.toLocaleString()} gal
            </div>
            <div className="flex gap-4 mt-1 text-xs text-ink-muted">
              <span>
                Yard{' '}
                <span className="font-semibold text-ink">{inYard.length}</span>
              </span>
              <span>
                On unit{' '}
                <span className="font-semibold text-ink">{onUnit.length}</span>
              </span>
              <span>
                Empty{' '}
                <span className="font-semibold text-ink">{empty.length}</span>
              </span>
              {onHold.length > 0 && (
                <span>
                  Hold{' '}
                  <span className="font-semibold text-ink">
                    {onHold.length}
                  </span>
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <NavItem to="/units" icon={Truck} label="Units" />
          <NavItem to="/jobs" icon={Wrench} label="Jobs" />
          <NavItem to="/inventory" icon={Package} label="Inventory" />
          <NavItem to="/search" icon={Search} label="Search" />
          <NavItem to="/receive" icon={PackagePlus} label="Receive" />
        </div>
      </div>
    </Layout>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="card flex flex-col items-center gap-1 py-2.5 active:bg-surface-sunken"
    >
      <Icon size={18} className="text-ink-muted" />
      <span className="text-xs font-medium text-ink">{label}</span>
    </Link>
  );
}
