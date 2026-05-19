import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  listEvents,
  listJobs,
  listProducts,
  listTotes,
  listUnits,
} from '../db/repo';
import type { Job, Product, Tote, ToteEvent, Unit } from '../types';
import {
  buildJobUsage,
  buildProductInventory,
  buildUnitLoadouts,
} from '../lib/analytics';
import { isPartial } from '../lib/status';
import {
  AlertTriangle,
  Boxes,
  ChevronRight,
  Download,
  Droplets,
  QrCode,
  Truck,
} from 'lucide-react';

export default function Supervisor() {
  const [products, setProducts] = useState<Product[]>([]);
  const [totes, setTotes] = useState<Tote[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [events, setEvents] = useState<ToteEvent[]>([]);

  useEffect(() => {
    void (async () => {
      const [nextProducts, nextTotes, nextUnits, nextJobs, nextEvents] =
        await Promise.all([
          listProducts(),
          listTotes(),
          listUnits(),
          listJobs(),
          listEvents(),
        ]);
      setProducts(nextProducts);
      setTotes(nextTotes);
      setUnits(nextUnits);
      setJobs(nextJobs);
      setEvents(nextEvents);
    })();
  }, []);

  const productRows = useMemo(
    () => buildProductInventory(products, totes),
    [products, totes]
  );
  const jobRows = useMemo(
    () => buildJobUsage(jobs, products, totes, events),
    [events, jobs, products, totes]
  );
  const unitRows = useMemo(
    () => buildUnitLoadouts(units, jobs, totes),
    [jobs, totes, units]
  );

  const activeTotes = totes.filter((tote) => tote.status !== 'discarded');
  const totalGal = activeTotes.reduce((sum, tote) => sum + tote.currentQtyGal, 0);
  const yardGal = activeTotes
    .filter((tote) => tote.location.kind === 'yard')
    .reduce((sum, tote) => sum + tote.currentQtyGal, 0);
  const unitGal = activeTotes
    .filter((tote) => tote.location.kind === 'unit')
    .reduce((sum, tote) => sum + tote.currentQtyGal, 0);
  const partials = activeTotes.filter(isPartial).length;
  const attention = activeTotes.filter(
    (tote) =>
      tote.currentQtyGal < 0 ||
      tote.currentQtyGal > 330 ||
      tote.status === 'hold' ||
      tote.location.kind === 'hold' ||
      tote.syncState !== 'synced'
  ).length;

  return (
    <Layout title="Supervisor" back="/more" showBottomNav>
      <div className="space-y-4">
        <section className="panel overflow-hidden">
          <div className="bg-chrome p-4 text-white">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-red-200">
              Coil Tubing Operations
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              ChemTrack Supervisor View
            </div>
            <div className="mt-2 text-sm text-white/75">
              Inventory, unit loadout, and job usage from the local demo snapshot.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-200">
            <Metric label="Active totes" value={activeTotes.length.toString()} />
            <Metric label="Total gallons" value={totalGal.toLocaleString()} />
            <Metric label="In yard" value={`${yardGal.toLocaleString()} gal`} />
            <Metric label="On units" value={`${unitGal.toLocaleString()} gal`} />
            <Metric label="Partial totes" value={partials.toString()} />
            <Metric label="Needs attention" value={attention.toString()} warn={attention > 0} />
          </div>
        </section>

        <section className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="label">Demo Loop</div>
              <div className="mt-1 text-sm text-ink-muted">
                Open the seeded tote, record usage, then watch this report update.
              </div>
            </div>
            <QrCode size={22} className="text-primary" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/scan" className="btn-primary">
              Scan Tote
            </Link>
            <Link to="/tote/RH-250414-007" className="btn-secondary">
              RH-250414-007
            </Link>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="label">Inventory Snapshot</div>
            <Link to="/inventory" className="text-xs font-extrabold uppercase text-action">
              Inventory
            </Link>
          </div>
          <div className="panel divide-y divide-slate-100">
            {productRows.map((row) => (
              <Link
                key={row.product.id}
                to={`/inventory/totes?product=${encodeURIComponent(row.product.id)}`}
                className="block p-4 active:bg-surface-sunken"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-sunken text-action">
                    <Boxes size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-extrabold">{row.product.name}</div>
                    <div className="mt-1 text-xs text-ink-muted">
                      Yard {row.yardGal.toLocaleString()} · Units {row.unitGal.toLocaleString()} · Hold {row.holdGal.toLocaleString()} gal
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-extrabold uppercase tracking-wide">
                      <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-800">
                        {row.fullCount} full
                      </span>
                      <span className="rounded bg-amber-100 px-2 py-1 text-amber-900">
                        {row.partialCount} partial
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">
                        {row.emptyCount} empty
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-action">
                      {row.totalGal.toLocaleString()}
                    </div>
                    <div className="text-xs text-ink-muted">gal</div>
                  </div>
                  <ChevronRight size={18} className="text-ink-muted" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="label">Job Usage</div>
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-extrabold uppercase text-action"
              onClick={() => downloadCsv(productRows, jobRows, unitRows)}
            >
              <Download size={14} />
              CSV
            </button>
          </div>
          <div className="panel divide-y divide-slate-100">
            {jobRows.slice(0, 6).map((row) => {
              const topProduct = Object.entries(row.products).sort((a, b) => b[1] - a[1])[0];
              return (
                <div key={row.job.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-primary">
                      <Droplets size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-extrabold">{row.job.name}</div>
                      <div className="mt-1 text-xs text-ink-muted">
                        {row.job.customer}
                        {row.job.region ? ` · ${row.job.region}` : ''}
                      </div>
                      {topProduct && (
                        <div className="mt-2 text-sm font-semibold text-ink-soft">
                          Top product: {topProduct[0]} ({topProduct[1]} gal)
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-extrabold text-primary">
                        {row.usedGal.toLocaleString()}
                      </div>
                      <div className="text-xs text-ink-muted">
                        gal used · {row.toteCount} tote{row.toteCount === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {jobRows.length === 0 && (
              <div className="p-6 text-center text-sm text-ink-muted">
                No job usage events yet. Record usage from a tote to populate this report.
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="label mb-2">Unit Loadout</div>
          <div className="panel divide-y divide-slate-100">
            {unitRows.slice(0, 8).map((row) => (
              <Link
                key={row.unit.id}
                to={`/units/${encodeURIComponent(row.unit.id)}`}
                className="flex items-center gap-3 p-4 active:bg-surface-sunken"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-sunken text-action">
                  <Truck size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold">{row.unit.name}</div>
                  <div className="mt-1 truncate text-xs text-ink-muted">
                    {row.jobs.length ? row.jobs.join(', ') : row.unit.region ?? 'No active job'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-action">
                    {row.totalGal.toLocaleString()} gal
                  </div>
                  <div className="text-xs text-ink-muted">
                    {row.toteCount} totes · {row.partialCount} partial · {row.emptyCount} empty
                  </div>
                </div>
                <ChevronRight size={18} className="text-ink-muted" />
              </Link>
            ))}
          </div>
        </section>

        <Link to="/attention" className="btn-secondary w-full">
          <AlertTriangle size={18} />
          Review Needs Attention
        </Link>
      </div>
    </Layout>
  );
}

function Metric({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-white p-4">
      <div className={`text-2xl font-extrabold ${warn ? 'text-field-orange' : 'text-ink'}`}>
        {value}
      </div>
      <div className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">
        {label}
      </div>
    </div>
  );
}

function downloadCsv(
  products: ReturnType<typeof buildProductInventory>,
  jobs: ReturnType<typeof buildJobUsage>,
  units: ReturnType<typeof buildUnitLoadouts>
) {
  const lines = [
    ['section', 'name', 'metric_1', 'metric_2', 'metric_3'],
    ...products.map((row) => [
      'inventory',
      row.product.name,
      `${row.totalGal} gal`,
      `${row.count} totes`,
      `${row.fullCount} full / ${row.partialCount} partial / ${row.emptyCount} empty`,
    ]),
    ...jobs.map((row) => [
      'job_usage',
      row.job.name,
      `${row.usedGal} gal used`,
      `${row.toteCount} totes`,
      Object.entries(row.products)
        .map(([name, gal]) => `${name}: ${gal} gal`)
        .join('; '),
    ]),
    ...units.map((row) => [
      'unit_loadout',
      row.unit.name,
      `${row.totalGal} gal`,
      `${row.toteCount} totes`,
      `${row.partialCount} partial / ${row.emptyCount} empty`,
    ]),
  ];
  const csv = lines.map((line) => line.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chemtrack-demo-report.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
