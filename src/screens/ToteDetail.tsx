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
import { labelForType } from '../lib/events';

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
        <div className="text-ink-muted text-center mt-10">Loading tote…</div>
      </Layout>
    );
  }

  if (!tote) {
    return (
      <Layout title="Tote not found" back="/scan">
        <div className="card p-6 text-center">
          <div className="text-lg font-semibold mb-2">Tote not found</div>
          <div className="text-sm text-ink-muted mb-4">
            ID <code>{id}</code> doesn't exist in the local snapshot.
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
        ? 'Hold / Inspection'
        : unit?.name ?? 'Unit';

  return (
    <Layout title={tote.id} back="/scan">
      <div className="space-y-4">
        {/* Header card */}
        <div className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="label">Tote</div>
              <div className="text-xl font-bold">{tote.id}</div>
              <div className="text-ink-soft mt-0.5">
                {product?.name ?? tote.productId}
              </div>
            </div>
            <div className="text-right">
              <div className="label">Current Qty</div>
              <div className="text-2xl font-extrabold text-primary">
                {tote.currentQtyGal}
                <span className="text-sm font-semibold text-ink-muted">
                  {' '}
                  / {TOTE_CAPACITY_GAL} gal
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={tote.status} />
            <PartialBadge tote={tote} />
            <SyncBadge state={tote.syncState} />
          </div>
        </div>

        {/* Details card */}
        <div className="card p-4 space-y-3">
          <Row label="Location" value={locationLabel} />
          {unit?.region && <Row label="Region" value={unit.region} />}
          <Row label="Job" value={job?.name ?? '—'} />
          <Row
            label="Last Update"
            value={
              <>
                {tote.updatedLabel ?? 'Updated'} • {formatTime(tote.updatedAt)}
                <div className="text-xs text-ink-muted font-normal">
                  by {tote.updatedBy}
                </div>
              </>
            }
          />
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="card p-4">
            <div className="label mb-3">Actions</div>
            <div className="grid gap-2">
              {actions.map((a) => (
                <Link
                  key={a.id}
                  to={a.to}
                  className={
                    a.tone === 'danger'
                      ? 'btn-danger'
                      : a.tone === 'primary'
                        ? 'btn-primary'
                        : 'btn-secondary'
                  }
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Event history */}
        <div className="card p-4">
          <div className="label mb-3">History</div>
          {events.length === 0 ? (
            <div className="text-sm text-ink-muted">No events yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="py-2 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {labelForType(e.type)}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {formatTime(e.createdAt)} • {e.createdBy}
                    </div>
                  </div>
                  {!e.synced && (
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                      pending
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="label pt-0.5">{label}</div>
      <div className="value text-right flex-1">{value}</div>
    </div>
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
