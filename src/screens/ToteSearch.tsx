import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { listProducts, listTotes } from '../db/repo';
import type { Product, Tote } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export default function ToteSearch() {
  const [totes, setTotes] = useState<Tote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    void (async () => {
      const [nextTotes, nextProducts] = await Promise.all([listTotes(), listProducts()]);
      setTotes(nextTotes);
      setProducts(nextProducts);
    })();
  }, []);

  const productNames = useMemo(
    () => new Map(products.map((product) => [product.id, product.name])),
    [products]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const sorted = [...totes].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    if (!needle) return sorted.slice(0, 40);
    return sorted
      .filter(
        (t) =>
          t.id.toLowerCase().includes(needle) ||
          t.productId.toLowerCase().includes(needle) ||
          t.status.toLowerCase().includes(needle) ||
          (productNames.get(t.productId) ?? '').toLowerCase().includes(needle)
      )
      .slice(0, 40);
  }, [productNames, totes, q]);

  return (
    <Layout title="Search Tote" back="/">
      <div className="space-y-4">
        <section className="surface-tint animate-rise-in px-5 py-4">
          <div className="label">Lookup</div>
          <p className="page-intro mt-2">
            Search by tote ID, product name, or status. Results are sorted by the most recent
            update.
          </p>
        </section>

        <input
          className="input animate-rise-in delay-1"
          placeholder="Search by tote ID, product name, or status"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoCapitalize="characters"
        />

        <div className="card animate-rise-in delay-2 p-3">
          <ul className="divide-y divide-slate-100/70">
            {filtered.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/tote/${encodeURIComponent(t.id)}`}
                  className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/55 active:bg-surface-sunken"
                >
                  <div>
                    <div className="font-mono text-sm font-semibold text-ink">{t.id}</div>
                    <div className="text-sm text-ink-soft">
                      {productNames.get(t.productId) ?? t.productId}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {t.currentQtyGal} gal • {t.updatedLabel ?? 'Updated'}
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
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
