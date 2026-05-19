import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { listProducts, listTotes, listUnits } from '../db/repo';
import type { Product, Tote, Unit } from '../types';
import { PartialBadge, StatusBadge } from '../components/StatusBadge';
import { Search } from 'lucide-react';

export default function ToteSearch() {
  const [totes, setTotes] = useState<Tote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    void (async () => {
      const [nextTotes, nextProducts, nextUnits] = await Promise.all([
        listTotes(),
        listProducts(),
        listUnits(),
      ]);
      setTotes(nextTotes);
      setProducts(nextProducts);
      setUnits(nextUnits);
    })();
  }, []);

  const productName = (id: string) =>
    products.find((product) => product.id === id)?.name ?? id;
  const locationName = (tote: Tote) => {
    if (tote.location.kind === 'yard') return 'Yard';
    if (tote.location.kind === 'hold') return 'Hold / Inspection';
    return units.find((unit) => unit.id === tote.location.unitId)?.name ?? 'Unit';
  };

  const needle = q.trim().toLowerCase();
  const filtered = (
    needle
      ? totes.filter(
          (t) =>
            t.id.toLowerCase().includes(needle) ||
            t.productId.toLowerCase().includes(needle) ||
            productName(t.productId).toLowerCase().includes(needle) ||
            locationName(t).toLowerCase().includes(needle) ||
            t.status.toLowerCase().includes(needle)
        )
      : totes
  ).slice(0, 40);

  return (
    <Layout title="Search Tote" back="/" showBottomNav>
      <div className="space-y-3">
        <section className="panel p-4">
          <div className="label mb-2 flex items-center gap-2">
            <Search size={15} />
            Manual lookup
          </div>
          <input
            className="input font-mono"
            placeholder="RH-250414-007"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoCapitalize="characters"
          />
          <div className="mt-2 text-xs text-ink-muted">
            Search by tote ID, product, status, or unit.
          </div>
        </section>
        <div className="card p-2">
          <ul className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/tote/${encodeURIComponent(t.id)}`}
                  className="py-3 px-2 flex items-center justify-between active:bg-surface-sunken"
                >
                  <div>
                    <div className="font-mono text-sm font-semibold">
                      {t.id}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {productName(t.productId)} · {locationName(t)} · {t.currentQtyGal} gal
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={t.status} />
                    <PartialBadge tote={t} />
                  </div>
                </Link>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-6 text-center text-sm text-ink-muted">
                No totes matched.
              </li>
            )}
          </ul>
        </div>
      </div>
    </Layout>
  );
}
