import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { listTotes, listUnits } from '../db/repo';
import type { Tote, Unit } from '../types';
import { ChevronRight, Truck } from 'lucide-react';

export default function Units() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [totesByUnit, setTotesByUnit] = useState<Record<string, Tote[]>>({});

  useEffect(() => {
    void (async () => {
      const [us, ts] = await Promise.all([listUnits(), listTotes()]);
      setUnits(us);
      const map: Record<string, Tote[]> = {};
      for (const t of ts) {
        if (t.location.kind === 'unit' && t.location.unitId) {
          (map[t.location.unitId] ||= []).push(t);
        }
      }
      setTotesByUnit(map);
    })();
  }, []);

  return (
    <Layout title="Units" back="/" showBottomNav>
      <div className="space-y-3">
        {units.map((u) => {
          const ts = totesByUnit[u.id] ?? [];
          const gal = ts.reduce((n, t) => n + t.currentQtyGal, 0);
          return (
            <Link
              key={u.id}
              to={`/units/${encodeURIComponent(u.id)}`}
              className={`panel block p-4 active:bg-surface-sunken ${
                !u.active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-sunken text-action">
                  <Truck size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-extrabold">
                    {u.name}
                    {!u.active && (
                      <span className="ml-2 text-xs font-semibold text-ink-muted">
                        (inactive)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {u.region ?? '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-action">
                    {gal.toLocaleString()}{' '}
                    <span className="text-xs font-semibold text-ink-muted">
                      gal
                    </span>
                  </div>
                  <div className="text-xs text-ink-muted">
                    {ts.length} tote{ts.length === 1 ? '' : 's'}
                  </div>
                </div>
                <ChevronRight size={18} className="text-ink-muted" />
              </div>
            </Link>
          );
        })}
      </div>
    </Layout>
  );
}
