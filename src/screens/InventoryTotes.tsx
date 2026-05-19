import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { listProducts, listTotes, listUnits } from '../db/repo';
import type { Product, Tote, Unit } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';
import { PartialBadge, StatusBadge, SyncBadge } from '../components/StatusBadge';
import { ChevronRight, Filter } from 'lucide-react';

export default function InventoryTotes() {
  const [params] = useSearchParams();
  const [totes, setTotes] = useState<Tote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const productId = params.get('product');
  const location = params.get('location');

  useEffect(() => {
    void (async () => {
      const [allTotes, allProducts, allUnits] = await Promise.all([
        listTotes(),
        listProducts(),
        listUnits(),
      ]);
      setTotes(allTotes.filter((t) => t.status !== 'discarded'));
      setProducts(allProducts);
      setUnits(allUnits);
    })();
  }, []);

  const productName = (id: string) =>
    products.find((p) => p.id === id)?.name ?? id;
  const unitName = (id: string) => units.find((u) => u.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    return totes
      .filter((t) => {
        if (productId && t.productId !== productId) return false;
        if (!location) return true;
        if (location === 'yard') return t.location.kind === 'yard';
        if (location === 'hold') return t.location.kind === 'hold';
        if (location.startsWith('unit:')) {
          return (
            t.location.kind === 'unit' &&
            t.location.unitId === location.slice('unit:'.length)
          );
        }
        return true;
      })
      .sort((a, b) => b.currentQtyGal - a.currentQtyGal || a.id.localeCompare(b.id));
  }, [location, productId, totes]);

  const totalGal = filtered.reduce((sum, tote) => sum + tote.currentQtyGal, 0);
  const title = productId
    ? productName(productId)
    : location
      ? locationLabel(location, unitName)
      : 'Inventory Totes';

  return (
    <Layout title="Inventory Totes" back="/inventory" rightSlot={<Filter size={22} />} showBottomNav>
      <div className="space-y-4">
        <section className="panel p-4">
          <div className="label">Filtered View</div>
          <div className="mt-1 text-2xl font-extrabold">{title}</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-surface-sunken p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                Total
              </div>
              <div className="mt-1 text-2xl font-extrabold text-action">
                {totalGal.toLocaleString()}
                <span className="ml-1 text-sm text-ink-muted">gal</span>
              </div>
            </div>
            <div className="rounded-lg bg-surface-sunken p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                Totes
              </div>
              <div className="mt-1 text-2xl font-extrabold">
                {filtered.length}
              </div>
            </div>
          </div>
        </section>

        <section className="panel divide-y divide-slate-100">
          {filtered.map((tote) => (
            <Link
              key={tote.id}
              to={`/tote/${encodeURIComponent(tote.id)}`}
              className="flex items-center gap-3 p-4 active:bg-surface-sunken"
            >
              <div className="min-w-0 flex-1">
                <div className="font-mono text-lg font-extrabold leading-tight">
                  {tote.id}
                </div>
                <div className="mt-1 text-sm text-ink-muted">
                  {productName(tote.productId)}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <StatusBadge status={tote.status} />
                  <PartialBadge tote={tote} />
                  {tote.syncState !== 'synced' && <SyncBadge state={tote.syncState} />}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-extrabold">
                  {tote.currentQtyGal}
                  <span className="text-xs text-ink-muted"> / {TOTE_CAPACITY_GAL}</span>
                </div>
                <div className="text-xs text-ink-muted">gal</div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-ink-muted" />
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-lg font-extrabold">No totes found</div>
              <div className="mt-1 text-sm text-ink-muted">
                Nothing matches this inventory view.
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function locationLabel(location: string, unitName: (id: string) => string) {
  if (location === 'yard') return 'Yard';
  if (location === 'hold') return 'Hold / Inspection';
  if (location.startsWith('unit:')) return unitName(location.slice('unit:'.length));
  return 'Location';
}
