import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import Layout from '../components/Layout';
import { listProducts, listTotes, listUnits } from '../db/repo';
import type { Product, Tote, Unit } from '../types';

interface LocationRow {
  label: string;
  gal: number;
  count: number;
}

interface LotRow {
  lot: string;
  gal: number;
  count: number;
  oldestReceivedAt: string;
}

interface ProductRollup {
  product: Product;
  totes: Tote[];
  totalGal: number;
  totalLb: number;
  byLocation: LocationRow[];
  byLot: LotRow[];
  oldestReceivedAt: string | null;
  expiringSoonCount: number;
  belowThreshold: boolean;
}

const NINETY_DAYS_MS = 1000 * 60 * 60 * 24 * 90;

export default function Inventory() {
  const [rollups, setRollups] = useState<ProductRollup[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const [products, totes, units] = await Promise.all([
        listProducts(),
        listTotes(),
        listUnits(),
      ]);
      setRollups(buildRollups(products, totes, units));
      setLoaded(true);
    })();
  }, []);

  const totals = useMemo(() => {
    const gal = rollups.reduce((s, r) => s + r.totalGal, 0);
    const lb = rollups.reduce((s, r) => s + r.totalLb, 0);
    const expiring = rollups.reduce((s, r) => s + r.expiringSoonCount, 0);
    const below = rollups.filter((r) => r.belowThreshold).length;
    return { gal, lb, expiring, below };
  }, [rollups]);

  return (
    <Layout title="Inventory" back="/">
      <div className="space-y-3">
        {loaded && rollups.length > 0 && (
          <div className="card px-3 py-2.5">
            <div className="text-xs text-ink-muted">
              {totals.gal.toLocaleString()} gal · {totals.lb.toLocaleString()} lb
              on hand
            </div>
            {(totals.below > 0 || totals.expiring > 0) && (
              <div className="flex gap-3 mt-1 text-xs">
                {totals.below > 0 && (
                  <span className="text-amber-700 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {totals.below} below threshold
                  </span>
                )}
                {totals.expiring > 0 && (
                  <span className="text-amber-700 flex items-center gap-1">
                    <Clock size={12} />
                    {totals.expiring} expiring &lt;90d
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {rollups.map((r) => (
          <ProductCard key={r.product.id} rollup={r} />
        ))}

        {loaded && rollups.length === 0 && (
          <div className="text-ink-muted text-center text-sm">
            No inventory yet.
          </div>
        )}
      </div>
    </Layout>
  );
}

function ProductCard({ rollup: r }: { rollup: ProductRollup }) {
  const { product } = r;
  const threshold = product.reorderThresholdGal ?? 0;
  const pct =
    threshold > 0 ? Math.min(100, (r.totalGal / threshold) * 100) : 100;
  const barColor = r.belowThreshold
    ? 'bg-amber-500'
    : pct < 200
      ? 'bg-emerald-500'
      : 'bg-emerald-600';

  return (
    <div className="card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{product.name}</div>
          <div className="text-xs text-ink-muted">
            {product.manufacturer ?? '—'} · {product.densityLbPerGal} lb/gal
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-bold tabular-nums">
            {r.totalGal.toLocaleString()}
            <span className="text-xs text-ink-muted font-normal"> gal</span>
          </div>
          <div className="text-[11px] text-ink-muted">
            {r.totalLb.toLocaleString()} lb · {r.totes.length} tote
            {r.totes.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {threshold > 0 && (
        <div className="mt-2">
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-0.5 flex justify-between text-[11px] text-ink-muted">
            <span>
              {r.belowThreshold && (
                <span className="text-amber-700 font-medium">Below </span>
              )}
              reorder at {threshold.toLocaleString()} gal
            </span>
            {r.oldestReceivedAt && (
              <span>oldest {ageInDays(r.oldestReceivedAt)}d</span>
            )}
          </div>
        </div>
      )}

      {r.expiringSoonCount > 0 && (
        <div className="mt-2 text-[11px] text-amber-700 flex items-center gap-1">
          <Clock size={11} />
          {r.expiringSoonCount} tote{r.expiringSoonCount === 1 ? '' : 's'}{' '}
          expiring within 90 days
        </div>
      )}

      {r.byLocation.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {r.byLocation.map((row) => (
            <div key={row.label} className="flex justify-between text-xs">
              <span className="text-ink-muted">{row.label}</span>
              <span className="font-medium tabular-nums">
                {row.gal.toLocaleString()} gal
                <span className="text-ink-muted font-normal">
                  {' '}
                  ({row.count})
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {r.byLot.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <div className="label mb-1">Lots</div>
          <div className="space-y-0.5">
            {r.byLot.map((lot) => (
              <div
                key={lot.lot}
                className="flex justify-between text-xs"
              >
                <span className="font-mono text-[11px] text-ink-muted truncate">
                  {lot.lot}
                </span>
                <span className="font-medium tabular-nums">
                  {lot.gal.toLocaleString()} gal
                  <span className="text-ink-muted font-normal">
                    {' '}
                    ({lot.count})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {r.totes.slice(0, 8).map((t) => (
          <Link
            key={t.id}
            to={`/tote/${encodeURIComponent(t.id)}`}
            state={{ from: '/inventory' }}
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
  );
}

function buildRollups(
  products: Product[],
  totes: Tote[],
  units: Unit[],
): ProductRollup[] {
  const unitName = new Map(units.map((u) => [u.id, u.name]));
  const map = new Map<string, ProductRollup>();
  for (const p of products) {
    map.set(p.id, {
      product: p,
      totes: [],
      totalGal: 0,
      totalLb: 0,
      byLocation: [],
      byLot: [],
      oldestReceivedAt: null,
      expiringSoonCount: 0,
      belowThreshold: false,
    });
  }

  const locationGroups = new Map<string, Map<string, LocationRow>>();
  const lotGroups = new Map<string, Map<string, LotRow>>();

  for (const t of totes) {
    if (t.status === 'discarded') continue;
    const r = map.get(t.productId);
    if (!r) continue;
    r.totes.push(t);
    r.totalGal += t.currentQtyGal;
    r.totalLb += Math.round(t.currentQtyGal * r.product.densityLbPerGal);

    if (t.expiresAt) {
      const ms = new Date(t.expiresAt).getTime() - Date.now();
      if (ms < NINETY_DAYS_MS) r.expiringSoonCount++;
    }

    if (!r.oldestReceivedAt || t.receivedAt < r.oldestReceivedAt) {
      r.oldestReceivedAt = t.receivedAt;
    }

    const locKey =
      t.location.kind === 'yard'
        ? 'yard'
        : t.location.kind === 'hold'
          ? 'hold'
          : `unit:${t.location.unitId}`;
    const locLabel =
      t.location.kind === 'yard'
        ? 'Yard'
        : t.location.kind === 'hold'
          ? 'Hold'
          : unitName.get(t.location.unitId ?? '') ?? 'Unit';
    const locMap = locationGroups.get(t.productId) ?? new Map();
    const locRow = locMap.get(locKey) ?? { label: locLabel, gal: 0, count: 0 };
    locRow.gal += t.currentQtyGal;
    locRow.count += 1;
    locMap.set(locKey, locRow);
    locationGroups.set(t.productId, locMap);

    if (t.lotNumber) {
      const lotMap = lotGroups.get(t.productId) ?? new Map();
      const lotRow = lotMap.get(t.lotNumber) ?? {
        lot: t.lotNumber,
        gal: 0,
        count: 0,
        oldestReceivedAt: t.receivedAt,
      };
      lotRow.gal += t.currentQtyGal;
      lotRow.count += 1;
      if (t.receivedAt < lotRow.oldestReceivedAt) {
        lotRow.oldestReceivedAt = t.receivedAt;
      }
      lotMap.set(t.lotNumber, lotRow);
      lotGroups.set(t.productId, lotMap);
    }
  }

  for (const r of map.values()) {
    const locMap = locationGroups.get(r.product.id);
    if (locMap) {
      r.byLocation = Array.from(locMap.values()).sort((a, b) => b.gal - a.gal);
    }
    const lotMap = lotGroups.get(r.product.id);
    if (lotMap) {
      r.byLot = Array.from(lotMap.values()).sort(
        (a, b) => (a.oldestReceivedAt < b.oldestReceivedAt ? -1 : 1),
      );
    }
    if (r.product.reorderThresholdGal != null) {
      r.belowThreshold = r.totalGal < r.product.reorderThresholdGal;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalGal - a.totalGal);
}

function ageInDays(iso: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)),
  );
}
