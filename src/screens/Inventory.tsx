import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { listProducts, listTotes, listUnits } from '../db/repo';
import type { Product, Tote, Unit } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';
import { AlertTriangle, Building2, ChevronRight, Filter, Truck } from 'lucide-react';
import { isFull, isPartial } from '../lib/status';

interface ProductRollup {
  product: Product;
  totalGal: number;
  totes: Tote[];
  byLocation: Record<string, { label: string; gal: number; count: number }>;
  fullCount: number;
  partialCount: number;
  emptyCount: number;
}

export default function Inventory() {
  const [rollups, setRollups] = useState<ProductRollup[]>([]);
  const [locationRows, setLocationRows] = useState<
    { key: string; label: string; gal: number; count: number; tone: string }[]
  >([]);
  const [overview, setOverview] = useState({
    yard: 0,
    units: 0,
    hold: 0,
    partials: 0,
    attention: 0,
  });

  useEffect(() => {
    void (async () => {
      const [products, totes, units] = await Promise.all([
        listProducts(),
        listTotes(),
        listUnits(),
      ]);
      const unitName = new Map(units.map((u: Unit) => [u.id, u.name]));
      const map = new Map<string, ProductRollup>();
      for (const p of products) {
        map.set(p.id, {
          product: p,
          totalGal: 0,
          totes: [],
          byLocation: {},
          fullCount: 0,
          partialCount: 0,
          emptyCount: 0,
        });
      }
      for (const t of totes) {
        if (t.status === 'discarded') continue;
        const r = map.get(t.productId);
        if (!r) continue;
        r.totalGal += t.currentQtyGal;
        r.totes.push(t);
        if (t.currentQtyGal === 0) r.emptyCount += 1;
        else if (isPartial(t)) r.partialCount += 1;
        else if (isFull(t)) r.fullCount += 1;
        const key =
          t.location.kind === 'yard'
            ? 'yard'
            : t.location.kind === 'hold'
              ? 'hold'
              : `unit:${t.location.unitId}`;
        const label =
          t.location.kind === 'yard'
            ? 'Yard'
            : t.location.kind === 'hold'
              ? 'Hold'
              : unitName.get(t.location.unitId ?? '') ?? 'Unit';
        const row = r.byLocation[key] ?? { label, gal: 0, count: 0 };
        row.gal += t.currentQtyGal;
        row.count += 1;
        r.byLocation[key] = row;
      }
      const locations: Record<string, { label: string; gal: number; count: number; tone: string }> = {};
      const nextOverview = { yard: 0, units: 0, hold: 0, partials: 0, attention: 0 };
      for (const t of totes) {
        if (t.status === 'discarded') continue;
        const isYard = t.location.kind === 'yard';
        const isHold = t.location.kind === 'hold';
        const key = isYard ? 'yard' : isHold ? 'hold' : `unit:${t.location.unitId}`;
        const label = isYard
          ? 'Yard'
          : isHold
            ? 'Hold / Inspection'
            : unitName.get(t.location.unitId ?? '') ?? 'Unit';
        const tone = isYard ? 'text-field-green' : isHold ? 'text-field-orange' : 'text-action';
        const row = locations[key] ?? { label, gal: 0, count: 0, tone };
        row.gal += t.currentQtyGal;
        row.count += 1;
        locations[key] = row;
        if (isYard) nextOverview.yard += t.currentQtyGal;
        else if (isHold) nextOverview.hold += t.currentQtyGal;
        else nextOverview.units += t.currentQtyGal;
        if (isPartial(t)) nextOverview.partials += 1;
        if (
          t.currentQtyGal < 0 ||
          t.currentQtyGal > TOTE_CAPACITY_GAL ||
          t.status === 'hold' ||
          t.location.kind === 'hold' ||
          t.syncState !== 'synced'
        ) {
          nextOverview.attention += 1;
        }
      }
      setRollups(
        Array.from(map.values()).sort((a, b) => b.totalGal - a.totalGal)
      );
      setLocationRows(Object.entries(locations).map(([key, value]) => ({ key, ...value })).sort((a, b) => b.gal - a.gal));
      setOverview(nextOverview);
    })();
  }, []);

  return (
    <Layout title="Inventory" back="/" rightSlot={<Filter size={22} />} showBottomNav>
      <div className="space-y-4">
        <section>
          <div className="label mb-2">Overview</div>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="In Yard" value={overview.yard} tone="text-field-green" />
            <Metric label="On Units" value={overview.units} tone="text-action" />
            <Metric label="Hold / Insp." value={overview.hold} tone="text-field-orange" />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <Link to="/inventory/totes" className="panel p-3 active:bg-surface-sunken">
            <div className="text-xs font-bold text-ink-muted">All Active Totes</div>
            <div className="mt-2 text-2xl font-extrabold">Open List</div>
          </Link>
          <Link to="/attention" className="panel p-3 active:bg-surface-sunken">
            <div className="text-xs font-bold text-ink-muted">Needs Attention</div>
            <div className={`mt-2 text-2xl font-extrabold ${overview.attention > 0 ? 'text-field-orange' : 'text-field-green'}`}>
              {overview.attention}
            </div>
          </Link>
        </section>

        <section>
          <div className="label mb-2">By Product</div>
          <div className="panel divide-y divide-slate-100">
            {rollups.map((r, index) => (
              <LinkRow
                key={r.product.id}
                rollup={r}
                color={productColor(index)}
                maxTotal={Math.max(...rollups.map((x) => x.totalGal), 1)}
              />
            ))}
            {rollups.length === 0 && (
              <div className="p-6 text-center text-sm text-ink-muted">
                No inventory yet.
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="label mb-2">By Location</div>
          <div className="panel divide-y divide-slate-100 px-4">
            {locationRows.map((row) => (
              <Link
                key={row.key}
                to={`/inventory/totes?location=${encodeURIComponent(row.key)}`}
                className="flex items-center gap-3 py-3 active:bg-surface-sunken"
              >
                <div className={row.tone}>
                  {row.key === 'yard' ? (
                    <Building2 size={21} />
                  ) : row.key === 'hold' ? (
                    <AlertTriangle size={21} />
                  ) : (
                    <Truck size={21} />
                  )}
                </div>
                <div className="flex-1 font-semibold">{row.label}</div>
                <div className="text-right">
                  <div className={`text-lg font-extrabold ${row.tone}`}>
                    {row.gal.toLocaleString()} gal
                  </div>
                  <div className="text-xs text-ink-muted">
                    {row.count} tote{row.count === 1 ? '' : 's'}
                  </div>
                </div>
                <ChevronRight size={18} className="text-ink-muted" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="panel p-3 text-center">
      <div className={`text-xs font-bold ${tone}`}>{label}</div>
      <div className="mt-2 text-2xl font-extrabold">{value.toLocaleString()}</div>
      <div className="text-xs text-ink-muted">gal</div>
    </div>
  );
}

function LinkRow({
  rollup,
  color,
  maxTotal,
}: {
  rollup: ProductRollup;
  color: string;
  maxTotal: number;
}) {
  return (
    <Link
      to={`/inventory/totes?product=${encodeURIComponent(rollup.product.id)}`}
      className="block p-4 active:bg-surface-sunken"
    >
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{rollup.product.name}</div>
          <div className="text-xs text-ink-muted">
            {rollup.totes.length} tote{rollup.totes.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold">
            {rollup.totalGal.toLocaleString()}
          </div>
          <div className="text-xs text-ink-muted">gal</div>
        </div>
        <ChevronRight size={18} className="text-ink-muted" />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, (rollup.totalGal / maxTotal) * 100)}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-extrabold uppercase tracking-wide">
        <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-800">
          {rollup.fullCount} full
        </span>
        <span className="rounded bg-amber-100 px-2 py-1 text-amber-900">
          {rollup.partialCount} partial
        </span>
        <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">
          {rollup.emptyCount} empty
        </span>
      </div>
    </Link>
  );
}

function productColor(index: number) {
  return ['bg-action', 'bg-primary', 'bg-field-green', 'bg-field-orange', 'bg-slate-500'][index % 5];
}
