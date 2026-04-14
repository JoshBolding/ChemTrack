import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { listTotes } from '../db/repo';
import type { Tote } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export default function ToteSearch() {
  const [totes, setTotes] = useState<Tote[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    void (async () => {
      setTotes(await listTotes());
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return totes.slice(0, 40);
    return totes
      .filter(
        (t) =>
          t.id.toLowerCase().includes(needle) ||
          t.productId.toLowerCase().includes(needle) ||
          t.status.toLowerCase().includes(needle)
      )
      .slice(0, 40);
  }, [totes, q]);

  return (
    <Layout title="Search Tote" back="/">
      <div className="space-y-3">
        <input
          className="input"
          placeholder="Search by ID, product, or status"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoCapitalize="characters"
        />
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
                      {t.currentQtyGal} gal
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
