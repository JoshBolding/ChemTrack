import type { Tote, ToteStatus } from '../types';
import { TOTE_STATUS_LABELS } from '../types';
import { isPartial } from '../lib/status';

const toneForStatus: Record<ToteStatus, string> = {
  in_yard: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  assigned_to_unit: 'bg-blue-100 text-blue-800 border-blue-200',
  empty: 'bg-slate-100 text-slate-700 border-slate-200',
  hold: 'bg-amber-100 text-amber-800 border-amber-300',
  discarded: 'bg-zinc-200 text-zinc-600 border-zinc-300 line-through',
};

export function StatusBadge({ status }: { status: ToteStatus }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${toneForStatus[status]}`}
    >
      {TOTE_STATUS_LABELS[status]}
    </span>
  );
}

export function PartialBadge({ tote }: { tote: Tote }) {
  if (!isPartial(tote)) return null;
  return (
    <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full border bg-yellow-50 text-yellow-800 border-yellow-200">
      Partial
    </span>
  );
}

const syncTone: Record<Tote['syncState'], string> = {
  synced: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  error: 'bg-red-50 text-red-700 border-red-200',
};

const syncLabel: Record<Tote['syncState'], string> = {
  synced: 'Synced',
  pending: 'Pending sync',
  error: 'Sync error',
};

export function SyncBadge({ state }: { state: Tote['syncState'] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${syncTone[state]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          state === 'synced'
            ? 'bg-emerald-500'
            : state === 'pending'
              ? 'bg-yellow-500'
              : 'bg-red-500'
        }`}
      />
      {syncLabel[state]}
    </span>
  );
}
