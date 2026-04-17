import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { listTotes, listUnits } from '../db/repo';
import type { Tote, Unit } from '../types';

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
    <Layout title="Units" back="/">
      <div className="card divide-y divide-slate-100">
        {units.map((u) => {
          const ts = totesByUnit[u.id] ?? [];
          const gal = ts.reduce((n, t) => n + t.currentQtyGal, 0);
          return (
            <Link
              key={u.id}
              to={`/units/${encodeURIComponent(u.id)}`}
              className={`block px-3 py-2.5 active:bg-surface-sunken ${!u.active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {u.name}
                    {!u.active && <span className="ml-1 text-xs text-ink-muted">(inactive)</span>}
                  </div>
                  <div className="text-xs text-ink-muted">{u.region ?? '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">
                    {gal.toLocaleString()} <span className="text-xs text-ink-muted font-normal">gal</span>
                  </div>
                  <div className="text-xs text-ink-muted">
                    {ts.length} tote{ts.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Layout>
  );
}
