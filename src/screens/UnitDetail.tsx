import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getUnit, listProducts, listTotes } from '../db/repo';
import type { Product, Tote, Unit } from '../types';
import { StatusBadge, PartialBadge } from '../components/StatusBadge';

export default function UnitDetail() {
  const { id = '' } = useParams();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [totes, setTotes] = useState<Tote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    void (async () => {
      const [u, allTotes, prods] = await Promise.all([
        getUnit(id), listTotes(), listProducts(),
      ]);
      setUnit(u ?? null);
      setTotes(allTotes.filter((t) => t.location.kind === 'unit' && t.location.unitId === id));
      setProducts(prods);
    })();
  }, [id]);

  const productName = (pid: string) => products.find((p) => p.id === pid)?.name ?? pid;

  const rollup = totes.reduce<Record<string, { name: string; gal: number; count: number }>>(
    (acc, t) => {
      const name = productName(t.productId);
      const row = acc[t.productId] ?? { name, gal: 0, count: 0 };
      row.gal += t.currentQtyGal;
      row.count += 1;
      acc[t.productId] = row;
      return acc;
    },
    {},
  );
  const totalGal = totes.reduce((n, t) => n + t.currentQtyGal, 0);

  if (!unit) return <Layout title="Loading…" back="/units"><div /></Layout>;

  return (
    <Layout title={unit.name} back="/units">
      <div className="space-y-3">
        <div className="card p-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-sm font-semibold">{unit.name}</div>
              <div className="text-xs text-ink-muted">{unit.region ?? '—'}</div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold">
                {totalGal.toLocaleString()} <span className="text-xs text-ink-muted font-normal">gal</span>
              </div>
              <div className="text-xs text-ink-muted">
                {totes.length} tote{totes.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>

        {Object.keys(rollup).length > 0 && (
          <div className="card p-3">
            <div className="label mb-2">By product</div>
            <div className="space-y-0.5">
              {Object.values(rollup).map((r) => (
                <div key={r.name} className="flex justify-between text-xs">
                  <span className="text-ink-muted">{r.name}</span>
                  <span className="font-medium">
                    {r.gal.toLocaleString()} gal
                    <span className="text-ink-muted font-normal"> ({r.count})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="px-3 pt-2.5 pb-1">
            <span className="label">Totes</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {totes.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/tote/${encodeURIComponent(t.id)}`}
                  className="px-3 py-2 flex items-center justify-between gap-2 active:bg-surface-sunken"
                >
                  <div>
                    <div className="font-mono text-xs font-semibold">{t.id}</div>
                    <div className="text-xs text-ink-muted">{productName(t.productId)}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">{t.currentQtyGal} gal</span>
                    <StatusBadge status={t.status} />
                    <PartialBadge tote={t} />
                  </div>
                </Link>
              </li>
            ))}
            {totes.length === 0 && (
              <li className="px-3 py-4 text-xs text-ink-muted">No totes assigned.</li>
            )}
          </ul>
        </div>
      </div>
    </Layout>
  );
}
