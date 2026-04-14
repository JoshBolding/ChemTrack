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
        getUnit(id),
        listTotes(),
        listProducts(),
      ]);
      setUnit(u ?? null);
      setTotes(
        allTotes.filter(
          (t) => t.location.kind === 'unit' && t.location.unitId === id
        )
      );
      setProducts(prods);
    })();
  }, [id]);

  const productName = (pid: string) =>
    products.find((p) => p.id === pid)?.name ?? pid;

  const rollup = totes.reduce<Record<string, { name: string; gal: number; count: number }>>(
    (acc, t) => {
      const name = productName(t.productId);
      const row = acc[t.productId] ?? { name, gal: 0, count: 0 };
      row.gal += t.currentQtyGal;
      row.count += 1;
      acc[t.productId] = row;
      return acc;
    },
    {}
  );
  const totalGal = totes.reduce((n, t) => n + t.currentQtyGal, 0);

  if (!unit) return <Layout title="Loading…" back="/units"><div /></Layout>;

  return (
    <Layout title={unit.name} back="/units">
      <div className="space-y-4">
        <div className="card p-4">
          <div className="label">Unit</div>
          <div className="text-xl font-bold">{unit.name}</div>
          <div className="text-sm text-ink-soft">{unit.region ?? '—'}</div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-xs text-ink-muted">
              {totes.length} tote{totes.length === 1 ? '' : 's'} on unit
            </div>
            <div className="text-2xl font-extrabold text-primary">
              {totalGal.toLocaleString()}{' '}
              <span className="text-xs font-semibold text-ink-muted">gal</span>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="label mb-3">Inventory by product</div>
          <div className="space-y-1">
            {Object.values(rollup).map((r) => (
              <div key={r.name} className="flex justify-between text-sm">
                <span className="text-ink-soft">{r.name}</span>
                <span className="font-semibold">
                  {r.gal.toLocaleString()} gal
                  <span className="text-ink-muted font-normal"> ({r.count})</span>
                </span>
              </div>
            ))}
            {Object.keys(rollup).length === 0 && (
              <div className="text-sm text-ink-muted">No totes assigned.</div>
            )}
          </div>
        </div>

        <div className="card p-4">
          <div className="label mb-3">Totes</div>
          <ul className="divide-y divide-slate-100">
            {totes.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/tote/${encodeURIComponent(t.id)}`}
                  className="py-2 flex items-center justify-between gap-2 active:bg-surface-sunken"
                >
                  <div>
                    <div className="font-mono text-sm font-semibold">
                      {t.id}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {productName(t.productId)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {t.currentQtyGal} gal
                    </span>
                    <StatusBadge status={t.status} />
                    <PartialBadge tote={t} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}
