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
import ProductSafetyCard from '../components/ProductSafetyCard';
import { labelForType } from '../lib/events';
import {
  Briefcase,
  Clipboard,
  Clock,
  Copy,
  Droplets,
  Home,
  MapPin,
  MessageSquareText,
  QrCode,
  RotateCcw,
  Trash2,
} from 'lucide-react';

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
      <Layout title="Loading..." back="/scan">
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
        <section className="panel p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="label text-primary">Tote ID</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="truncate font-mono text-2xl font-extrabold tracking-tight">
                  {tote.id}
                </div>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted active:bg-surface-sunken"
                  onClick={() => navigator.clipboard?.writeText(tote.id)}
                  aria-label="Copy tote ID"
                >
                  <Copy size={18} />
                </button>
              </div>
              <div className="mt-1 text-lg font-bold text-ink">
                {product?.name ?? tote.productId}
              </div>
              <div className="text-sm text-ink-muted">Product</div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 p-4">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-5xl font-extrabold tracking-tight">
                  {tote.currentQtyGal}
                </span>
                <span className="ml-2 text-xl font-semibold text-ink-soft">
                  / {TOTE_CAPACITY_GAL} gal
                </span>
              </div>
              <div className="pb-2 text-sm font-bold text-field-amber">
                {Math.round((tote.currentQtyGal / TOTE_CAPACITY_GAL) * 100)}%
              </div>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-field-amber"
                style={{
                  width: `${Math.min(100, Math.max(0, (tote.currentQtyGal / TOTE_CAPACITY_GAL) * 100))}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={tote.status} />
            <PartialBadge tote={tote} />
            <SyncBadge state={tote.syncState} />
          </div>
        </section>

        <section className="panel divide-y divide-slate-100 px-4">
          <Row icon={<MapPin size={18} />} label="Location" value={locationLabel} />
          <Row icon={<Home size={18} />} label="Region" value={unit?.region ?? '—'} />
          <Row icon={<Briefcase size={18} />} label="Job" value={job?.name ?? '—'} />
          <Row
            icon={<Clock size={18} />}
            label="Last Update"
            value={
              <>
                {tote.updatedLabel ?? 'Updated'} · {formatTime(tote.updatedAt)}
                <div className="text-xs text-ink-muted font-normal">
                  by {tote.updatedBy}
                </div>
              </>
            }
          />
        </section>

        {actions.length > 0 && (
          <section className="space-y-2">
            {actions.some((a) => a.id === 'usage') && (
              <Link to={`/tote/${encodeURIComponent(tote.id)}/usage`} className="btn-action w-full">
                <Droplets size={18} />
                Record Usage
              </Link>
            )}
            <div className="grid grid-cols-2 gap-2">
              {actions
                .filter((a) => a.id !== 'usage')
                .map((a) => (
                  <Link
                    key={a.id}
                    to={a.to}
                    className={
                      `${actions.filter((x) => x.id !== 'usage').length === 1 ? 'col-span-2 ' : ''}${
                      a.tone === 'danger'
                        ? 'btn-danger'
                        : a.tone === 'primary'
                          ? 'btn-primary'
                          : 'btn-secondary'}`
                    }
                  >
                    {a.id === 'return' && <RotateCcw size={18} />}
                    {a.id === 'empty' && <Trash2 size={18} />}
                    {a.id === 'discard' && <Trash2 size={18} />}
                    {a.id === 'assign' && <Clipboard size={18} />}
                    {a.id === 'note' && <MessageSquareText size={18} />}
                    {a.id === 'job' && <Briefcase size={18} />}
                    {a.label}
                  </Link>
                ))}
            </div>
          </section>
        )}

        <ProductSafetyCard product={product} />

        <section className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="label text-primary">Tote Label</div>
              <div className="mt-1 text-sm text-ink-muted">
                QR label value used for scan and manual lookup.
              </div>
            </div>
            <QrCode size={24} className="text-primary" />
          </div>
          <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-4">
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 grid-cols-4 gap-1 rounded bg-chrome p-2">
                {Array.from({ length: 16 }).map((_, index) => (
                  <span
                    key={index}
                    className={`rounded-sm ${index % 3 === 0 || index === 5 || index === 14 ? 'bg-white' : 'bg-primary'}`}
                  />
                ))}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">
                  ChemTrack
                </div>
                <div className="mt-1 truncate font-mono text-xl font-extrabold">
                  {tote.id}
                </div>
                <div className="mt-1 text-sm font-semibold text-ink-soft">
                  {product?.name ?? tote.productId}
                </div>
                <div className="text-xs text-ink-muted">
                  Scan or enter this ID to open the tote record.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="label">Event History</div>
            <div className="text-xs font-bold text-action">
              {events.length} event{events.length === 1 ? '' : 's'}
            </div>
          </div>
          {events.length === 0 ? (
            <div className="text-sm text-ink-muted">No events yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.slice(0, 3).map((e) => (
                <li
                  key={e.id}
                  className="py-2 flex items-start justify-between gap-3"
                >
                  <div className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-action" />
                    <div>
                      <div className="text-sm font-bold">
                      {labelForType(e.type)}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {formatTime(e.createdAt)} · {e.createdBy}
                      </div>
                    </div>
                  </div>
                  {!e.synced && (
                    <span className="rounded bg-yellow-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-yellow-800">
                      pending
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="text-ink-muted">{icon}</div>
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="value flex-1 text-right text-sm">{value}</div>
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
