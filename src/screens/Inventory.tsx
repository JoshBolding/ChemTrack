import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { listProducts, listTotes, listUnits } from '../db/repo';
import type { Product, Tote, Unit } from '../types';

interface ProductRollup {
  product: Product;
  totalGal: number;
  totes: Tote[];
  byLocation: Record<string, { label: string; gal: number; count: number }>;
}

export default function Inventory() {
  const [rollups, setRollups] = useState<ProductRollup[]>([]);

  useEffect(() => {
    void (async () => {
      const [products, totes, units] = await Promise.all([
        listProducts(), listTotes(), listUnits(),
      ]);
      const unitName = new Map(units.map((u: Unit) => [u.id, u.name]));
      const map = new Map<string, ProductRollup>();
      for (const p of products) {
        map.set(p.id, { product: p, totalGal: 0, totes: [], byLocation: {} });
      }
      for (const t of totes) {
        if (t.status === 'discarded') continue;
        const r = map.get(t.productId);
        if (!r) continue;
        r.totalGal += t.currentQtyGal;
        r.totes.push(t);
        const key =
          t.location.kind === 'yard' ? 'yard'
            : t.location.kind === 'hold' ? 'hold'
              : `unit:${t.location.unitId}`;
        const label =
          t.location.kind === 'yard' ? 'Yard'
            : t.location.kind === 'hold' ? 'Hold'
              : unitName.get(t.location.unitId ?? '') ?? 'Unit';
        const row = r.byLocation[key] ?? { label, gal: 0, count: 0 };
        row.gal += t.currentQtyGal;
        row.count += 1;
        r.byLocation[key] = row;
      }
      setRollups(Array.from(map.values()).sort((a, b) => b.totalGal - a.totalGal));
    })();
  }, []);

  return (
    <Layout title="Inventory" back="/">
      <div className="space-y-3">
        {rollups.map((r) => (
          <div key={r.product.id} className="card p-3">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-sm font-semibold">{r.product.name}</div>
                <div className="text-xs text-ink-muted">
                  {r.totes.length} tote{r.totes.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="text-base font-bold">
                {r.totalGal.toLocaleString()}
                <span className="text-xs text-ink-muted font-normal"> gal</span>
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              {Object.values(r.byLocation)
                .sort((a, b) => b.gal - a.gal)
                .map((row) => (
                  <div key={row.label} className="flex justify-between text-xs">
                    <span className="text-ink-muted">{row.label}</span>
                    <span className="font-medium">
                      {row.gal.toLocaleString()} gal
                      <span className="text-ink-muted font-normal"> ({row.count})</span>
                    </span>
                  </div>
                ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {r.totes.slice(0, 8).map((t) => (
                <Link
                  key={t.id}
                  to={`/tote/${encodeURIComponent(t.id)}`}
                  className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-sunken active:bg-slate-200"
                >
                  {t.id}
                </Link>
              ))}
              {r.totes.length > 8 && (
                <span className="text-[11px] text-ink-muted px-1.5 py-0.5">
                  +{r.totes.length - 8} more
                </span>
              )}
            </div>
          </div>
        ))}
        {rollups.length === 0 && (
          <div className="text-ink-muted text-center text-sm">No inventory yet.</div>
        )}
      </div>
    </Layout>
  );
}
