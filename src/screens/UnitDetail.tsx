import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getUnit, listJobs, listProducts, listTotes } from '../db/repo';
import type { Job, Product, Tote, Unit } from '../types';
import { PartialBadge } from '../components/StatusBadge';
import { isFull } from '../lib/status';
import { BarChart3, Briefcase, ChevronRight } from 'lucide-react';

export default function UnitDetail() {
  const { id = '' } = useParams();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [totes, setTotes] = useState<Tote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    void (async () => {
      const [u, allTotes, prods, allJobs] = await Promise.all([
        getUnit(id),
        listTotes(),
        listProducts(),
        listJobs(),
      ]);
      setUnit(u ?? null);
      setTotes(
        allTotes.filter(
          (t) => t.location.kind === 'unit' && t.location.unitId === id
        )
      );
      setProducts(prods);
      setJobs(allJobs);
    })();
  }, [id]);

  const productName = (pid: string) =>
    products.find((p) => p.id === pid)?.name ?? pid;
  const jobName = (jid: string) => jobs.find((j) => j.id === jid)?.name ?? jid;

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
  const jobRollup = totes.reduce<Record<string, { name: string; gal: number; count: number }>>(
    (acc, t) => {
      const key = t.jobId ?? 'none';
      const row = acc[key] ?? {
        name: t.jobId ? jobName(t.jobId) : 'No job context',
        gal: 0,
        count: 0,
      };
      row.gal += t.currentQtyGal;
      row.count += 1;
      acc[key] = row;
      return acc;
    },
    {}
  );

  if (!unit) return <Layout title="Loading..." back="/units"><div /></Layout>;

  return (
    <Layout title={unit.name} back="/units">
      <div className="space-y-4">
        <section className="panel p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-3xl font-extrabold">{unit.name}</div>
              <div className="mt-1 text-sm text-ink-soft">{unit.region ?? '—'}</div>
            </div>
            <span className="rounded bg-action px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
              On Location
            </span>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <div className="text-sm text-ink-muted">Total on Unit</div>
            <div className="mt-1">
              <span className="text-5xl font-extrabold tracking-tight">
                {totalGal.toLocaleString()}
              </span>
              <span className="ml-2 text-xl font-semibold">gal</span>
            </div>
            <div className="mt-1 text-sm text-ink-soft">
              Across {totes.length} tote{totes.length === 1 ? '' : 's'}
            </div>
          </div>
        </section>

        <section className="panel p-4">
          <div className="label mb-3">Inventory by product</div>
          <div className="space-y-3">
            {Object.values(rollup).map((r) => (
              <div key={r.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-ink">{r.name}</span>
                  <span className="font-semibold">
                    {r.gal.toLocaleString()} gal{' '}
                    <span className="text-ink-muted font-normal">
                      ({Math.round((r.gal / Math.max(1, totalGal)) * 100)}%)
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-full rounded-full bg-action"
                    style={{ width: `${Math.round((r.gal / Math.max(1, totalGal)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(rollup).length === 0 && (
              <div className="text-sm text-ink-muted">No totes assigned.</div>
            )}
          </div>
        </section>

        <section className="panel p-4">
          <div className="label mb-3 flex items-center gap-2">
            <Briefcase size={15} />
            Job context
          </div>
          <div className="space-y-2">
            {Object.entries(jobRollup).map(([key, row]) => (
              <div key={key} className="rounded-lg bg-surface-sunken p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{row.name}</div>
                    <div className="text-xs text-ink-muted">
                      {row.count} tote{row.count === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="text-right text-lg font-extrabold text-action">
                    {row.gal.toLocaleString()} gal
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-4">
          <div className="label mb-3">Totes</div>
          <ul className="divide-y divide-slate-100">
            {totes.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/tote/${encodeURIComponent(t.id)}`}
                  className="row-link"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-lg font-extrabold leading-tight">
                      {t.id}
                    </div>
                    <div className="mt-1 text-sm text-ink-muted">
                      {productName(t.productId)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="min-w-[92px] text-right">
                      <ConditionBadge tote={t} />
                      <div className="mt-1 text-sm font-bold">
                        {t.currentQtyGal} / 330 gal
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-ink-muted" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <Link to="/reports" className="btn-action w-full">
          <BarChart3 size={18} />
          Open Supervisor Report
        </Link>
      </div>
    </Layout>
  );
}

function ConditionBadge({ tote }: { tote: Tote }) {
  if (tote.currentQtyGal === 0) {
    return (
      <span className="inline-flex rounded border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
        Empty
      </span>
    );
  }
  if (isFull(tote)) {
    return (
      <span className="inline-flex rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
        Full
      </span>
    );
  }
  return <PartialBadge tote={tote} />;
}
