import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  getJob,
  getProduct,
  getTote,
  getUnit,
  listEventsForTote,
} from '../db/repo';
import type { Job, Product, Tote, ToteEvent, Unit } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';
import { actionsForStatus } from '../lib/status';
import {
  PartialBadge,
  StatusBadge,
  SyncBadge,
} from '../components/StatusBadge';
import { labelForType, noteForEvent, summaryForEvent } from '../lib/events';

export default function ToteDetail() {
  const { id = '' } = useParams();
  const [tote, setTote] = useState<Tote | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [events, setEvents] = useState<ToteEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const t = await getTote(id);
      if (cancelled) return;
      if (!t) {
        setTote(null);
        setLoading(false);
        return;
      }
      setTote(t);
      const [p, u, j, evs] = await Promise.all([
        getProduct(t.productId),
        t.location.kind === 'unit' && t.location.unitId
          ? getUnit(t.location.unitId)
          : Promise.resolve(undefined),
        t.jobId ? getJob(t.jobId) : Promise.resolve(undefined),
        listEventsForTote(t.id),
      ]);
      if (cancelled) return;
      setProduct(p ?? null);
      setUnit(u ?? null);
      setJob(j ?? null);
      setEvents(evs);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <Layout title="Loading…" back="/scan">
        <div className="text-ink-muted text-center text-sm mt-8">
          Loading tote…
        </div>
      </Layout>
    );
  }

  if (!tote) {
    return (
      <Layout title="Not found" back="/scan">
        <div className="card p-4 text-center">
          <div className="text-sm font-semibold mb-1">Tote not found</div>
          <div className="text-xs text-ink-muted mb-3">
            ID <code className="bg-surface-sunken px-1 rounded">{id}</code>{' '}
            doesn't exist locally.
          </div>
          <Link to="/scan" className="btn-primary inline-flex">
            Back to Scan
          </Link>
        </div>
      </Layout>
    );
  }

  const actions = actionsForStatus(tote.status, tote.id);
  const locationLabel =
    tote.location.kind === 'yard'
      ? 'Yard'
      : tote.location.kind === 'hold'
        ? 'Hold'
        : unit?.name ?? 'Unit';

  const pct = Math.min(
    100,
    (tote.currentQtyGal / TOTE_CAPACITY_GAL) * 100
  );

  return (
    <Layout title={tote.id} back="/scan">
      <div className="space-y-3">
        {/* Info */}
        <div className="card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {product?.name ?? tote.productId}
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <StatusBadge status={tote.status} />
                <PartialBadge tote={tote} />
                <SyncBadge state={tote.syncState} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-bold tabular-nums leading-tight">
                {tote.currentQtyGal}
                <span className="text-xs text-ink-muted font-normal">
                  {' '}
                  / {TOTE_CAPACITY_GAL}
                </span>
              </div>
              <div className="text-[11px] text-ink-muted">gallons</div>
            </div>
          </div>

          <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                pct === 0
                  ? 'bg-slate-300'
                  : pct < 30
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <div>
              <span className="text-ink-muted">Location </span>
              <span className="font-medium">{locationLabel}</span>
            </div>
            <div>
              <span className="text-ink-muted">Job </span>
              <span className="font-medium">{job?.name ?? '—'}</span>
            </div>
            {unit?.region && (
              <div>
                <span className="text-ink-muted">Region </span>
                <span className="font-medium">{unit.region}</span>
              </div>
            )}
            <div className="col-span-2 mt-0.5">
              <span className="text-ink-muted">
                {tote.updatedLabel ?? 'Updated'}{' '}
              </span>
              <span className="font-medium">{formatTime(tote.updatedAt)}</span>
              <span className="text-ink-muted"> by {tote.updatedBy}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="space-y-2">
            <Link
              to={actions[0].to}
              className={`w-full ${
                actions[0].tone === 'danger'
                  ? 'btn-danger'
                  : actions[0].tone === 'primary'
                    ? 'btn-primary'
                    : 'btn-secondary'
              }`}
            >
              {actions[0].label}
            </Link>
            {actions.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {actions.slice(1).map((a) => (
                  <Link
                    key={a.id}
                    to={a.to}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition active:scale-[0.98] ${
                      a.tone === 'danger'
                        ? 'bg-red-50 text-red-700 border border-red-200 active:bg-red-100'
                        : 'bg-white text-ink border border-slate-200 active:bg-surface-sunken'
                    }`}
                  >
                    {a.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div className="card">
          <div className="px-3 pt-2.5 pb-1">
            <span className="label">History</span>
          </div>
          {events.length === 0 ? (
            <div className="px-3 py-4 text-xs text-ink-muted">
              No events yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {events.map((e) => {
                const note = noteForEvent(e);
                const summary = summaryForEvent(e);
                return (
                  <div key={e.id} className="px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-medium">
                          {labelForType(e.type)}
                        </span>
                        {summary && (
                          <span className="text-xs text-ink-muted ml-1.5">
                            {summary}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-muted whitespace-nowrap shrink-0 flex items-center gap-1">
                        {!e.synced && (
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                        )}
                        {formatTime(e.createdAt)}
                      </div>
                    </div>
                    <div className="text-[11px] text-ink-muted">
                      {e.createdBy}
                    </div>
                    {note && (
                      <div className="mt-1 text-xs text-ink bg-surface-sunken rounded px-2 py-1">
                        {note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
