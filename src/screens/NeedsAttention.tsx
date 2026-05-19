import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { listJobs, listTotes, listUnits } from '../db/repo';
import type { Job, Tote, Unit } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';
import { AlertTriangle, ChevronRight, CloudOff, Gauge, PauseCircle } from 'lucide-react';

interface AttentionItem {
  id: string;
  tote: Tote;
  title: string;
  detail: string;
  severity: 'error' | 'warn' | 'info';
  icon: 'qty' | 'sync' | 'hold' | 'ref';
}

export default function NeedsAttention() {
  const [items, setItems] = useState<AttentionItem[]>([]);

  useEffect(() => {
    void (async () => {
      const [totes, units, jobs] = await Promise.all([
        listTotes(),
        listUnits(),
        listJobs(),
      ]);
      setItems(buildAttentionItems(totes, units, jobs));
    })();
  }, []);

  const errors = items.filter((i) => i.severity === 'error').length;
  const warnings = items.filter((i) => i.severity === 'warn').length;

  return (
    <Layout title="Needs Attention" back="/more" showBottomNav>
      <div className="space-y-4">
        <section className="grid grid-cols-3 gap-2">
          <Metric label="Errors" value={errors} tone="text-red-700" />
          <Metric label="Warnings" value={warnings} tone="text-field-orange" />
          <Metric label="Total" value={items.length} tone="text-action" />
        </section>

        <section className="panel divide-y divide-slate-100">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/tote/${encodeURIComponent(item.tote.id)}`}
              className="flex items-center gap-3 p-4 active:bg-surface-sunken"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  item.severity === 'error'
                    ? 'bg-red-50 text-red-700'
                    : item.severity === 'warn'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-blue-50 text-action'
                }`}
              >
                <IssueIcon icon={item.icon} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm font-extrabold">
                  {item.tote.id}
                </div>
                <div className="mt-0.5 font-semibold">{item.title}</div>
                <div className="mt-0.5 text-sm text-ink-muted">{item.detail}</div>
              </div>
              <ChevronRight size={18} className="text-ink-muted" />
            </Link>
          ))}
          {items.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-lg font-extrabold">All clear</div>
              <div className="mt-1 text-sm text-ink-muted">
                No local inventory exceptions found.
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function buildAttentionItems(totes: Tote[], units: Unit[], jobs: Job[]) {
  const unitById = new Map(units.map((u) => [u.id, u]));
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const out: AttentionItem[] = [];

  for (const tote of totes) {
    if (tote.currentQtyGal < 0 || tote.currentQtyGal > TOTE_CAPACITY_GAL) {
      out.push({
        id: `${tote.id}:qty`,
        tote,
        title: 'Quantity outside tote capacity',
        detail: `${tote.currentQtyGal} gal recorded; expected 0-${TOTE_CAPACITY_GAL} gal.`,
        severity: 'error',
        icon: 'qty',
      });
    }

    if (tote.syncState === 'pending' || tote.syncState === 'error') {
      out.push({
        id: `${tote.id}:sync`,
        tote,
        title: tote.syncState === 'error' ? 'Sync error' : 'Pending sync',
        detail:
          tote.syncState === 'error'
            ? 'This tote has a sync problem that needs review.'
            : 'This tote has changes waiting to sync.',
        severity: tote.syncState === 'error' ? 'error' : 'warn',
        icon: 'sync',
      });
    }

    if (tote.status === 'hold' || tote.location.kind === 'hold') {
      out.push({
        id: `${tote.id}:hold`,
        tote,
        title: 'Hold / inspection',
        detail: 'Tote is not available for normal assignment.',
        severity: 'warn',
        icon: 'hold',
      });
    }

    if (tote.location.kind === 'unit' && tote.location.unitId) {
      const unit = unitById.get(tote.location.unitId);
      if (!unit) {
        out.push({
          id: `${tote.id}:missing-unit`,
          tote,
          title: 'Missing unit reference',
          detail: `References ${tote.location.unitId}, but that unit is not in the local snapshot.`,
          severity: 'error',
          icon: 'ref',
        });
      } else if (!unit.active) {
        out.push({
          id: `${tote.id}:inactive-unit`,
          tote,
          title: 'Assigned to inactive unit',
          detail: `${unit.name} is marked inactive.`,
          severity: 'warn',
          icon: 'ref',
        });
      }
    }

    if (tote.jobId) {
      const job = jobById.get(tote.jobId);
      if (!job) {
        out.push({
          id: `${tote.id}:missing-job`,
          tote,
          title: 'Missing job reference',
          detail: `References ${tote.jobId}, but that job is not in the local snapshot.`,
          severity: 'error',
          icon: 'ref',
        });
      } else if (!job.active) {
        out.push({
          id: `${tote.id}:inactive-job`,
          tote,
          title: 'Assigned to inactive job',
          detail: `${job.name} is marked inactive.`,
          severity: 'warn',
          icon: 'ref',
        });
      }
    }
  }

  return out.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

function severityRank(severity: AttentionItem['severity']) {
  return severity === 'error' ? 0 : severity === 'warn' ? 1 : 2;
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="panel p-3 text-center">
      <div className={`text-2xl font-extrabold ${tone}`}>{value}</div>
      <div className="text-xs font-bold uppercase tracking-wide text-ink-muted">
        {label}
      </div>
    </div>
  );
}

function IssueIcon({ icon }: { icon: AttentionItem['icon'] }) {
  if (icon === 'qty') return <Gauge size={21} />;
  if (icon === 'sync') return <CloudOff size={21} />;
  if (icon === 'hold') return <PauseCircle size={21} />;
  return <AlertTriangle size={21} />;
}
