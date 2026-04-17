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
      const [t, p] = await Promise.all([listTotes(), listProducts()]);
      setTotes(t);
      setProducts(p);
    })();
  }, []);

  const productNames = useMemo(
    () => new Map(products.map((p) => [p.id, p.name])),
    [products],
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
          (productNames.get(t.productId) ?? '').toLowerCase().includes(needle),
      )
      .slice(0, 40);
  }, [productNames, totes, q]);

  return (
    <Layout title="Search" back="/">
      <div className="space-y-3">
        <input
          className="input"
          placeholder="Tote ID, product, or status"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoCapitalize="characters"
        />
        <div className="card">
          <ul className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/tote/${encodeURIComponent(t.id)}`}
                  state={{ from: '/search' }}
                  className="flex items-center justify-between gap-2 px-3 py-2 active:bg-surface-sunken"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold">{t.id}</div>
                    <div className="text-xs text-ink-muted truncate">
                      {productNames.get(t.productId) ?? t.productId} · {t.currentQtyGal} gal
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </Link>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-4 text-center text-xs text-ink-muted">No totes matched.</li>
            )}
          </ul>
        </div>
      </div>
    </Layout>
  );
}
