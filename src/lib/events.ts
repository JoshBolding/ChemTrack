// Event write helpers. Every user action funnels through writeEvent, which:
//   1. Appends an immutable event to the log
//   2. Updates the denormalized tote record transactionally
//   3. Marks the tote's sync state
//
// In V1, there is no live backend. "synced: false" represents changes captured
// offline and still queued locally on the device.

import type { EventType, Tote, ToteEvent } from '../types';
import { appendEvent, putTote } from '../db/repo';
import { uuid } from './ids';

export interface WriteEventArgs {
  tote: Tote;
  type: EventType;
  payload: Record<string, unknown>;
  createdBy: string;
  // Partial updates to apply to the tote record alongside the event.
  toteUpdates?: Partial<Tote>;
  updatedLabel?: string;
}

export async function writeEvent({
  tote,
  type,
  payload,
  createdBy,
  toteUpdates,
  updatedLabel,
}: WriteEventArgs): Promise<{ tote: Tote; event: ToteEvent }> {
  const now = new Date().toISOString();
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const event: ToteEvent = {
    id: uuid(),
    toteId: tote.id,
    type,
    createdAt: now,
    createdBy,
    payload,
    synced: online, // optimistic — a real sync worker would confirm
  };

  const updated: Tote = {
    ...tote,
    ...toteUpdates,
    updatedAt: now,
    updatedBy: createdBy,
    updatedLabel: updatedLabel ?? labelForType(type),
    syncState: online ? 'synced' : 'pending',
  };

  await appendEvent(event);
  await putTote(updated);

  return { tote: updated, event };
}

export function labelForType(type: EventType): string {
  switch (type) {
    case 'received':
      return 'Received';
    case 'assigned_to_unit':
      return 'Assigned to unit';
    case 'transferred':
      return 'Transferred';
    case 'returned_to_yard':
      return 'Returned to yard';
    case 'usage_recorded':
      return 'Usage recorded';
    case 'job_context_changed':
      return 'Job changed';
    case 'marked_empty':
      return 'Marked empty';
    case 'damaged_flagged':
      return 'Flagged damaged';
    case 'discarded':
      return 'Discarded';
    case 'note_added':
      return 'Note added';
    case 'qty_corrected':
      return 'Quantity corrected';
    case 'status_corrected':
      return 'Status corrected';
  }
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function noteForEvent(event: ToteEvent): string | undefined {
  return getString(event.payload.note);
}

export function summaryForEvent(event: ToteEvent): string | undefined {
  const { payload, type } = event;

  switch (type) {
    case 'received': {
      const qty = getNumber(payload.qty);
      return qty !== undefined ? `${qty} gal received` : undefined;
    }
    case 'assigned_to_unit': {
      const unitId = getString(payload.unitId);
      const jobId = getString(payload.jobId);
      if (unitId && jobId) return `${unitId} • ${jobId}`;
      return unitId ?? jobId;
    }
    case 'transferred': {
      const fromUnitId = getString(payload.fromUnitId);
      const toUnitId = getString(payload.toUnitId);
      if (fromUnitId && toUnitId) return `${fromUnitId} -> ${toUnitId}`;
      return toUnitId ?? fromUnitId;
    }
    case 'returned_to_yard': {
      const qtyNum = getNumber(payload.qtyNum);
      const condition = getString(payload.condition);
      if (qtyNum !== undefined && condition) return `${condition} • ${qtyNum} gal`;
      if (qtyNum !== undefined) return `${qtyNum} gal`;
      return condition;
    }
    case 'usage_recorded': {
      const usedDeltaGal = getNumber(payload.usedDeltaGal);
      const newQtyGal = getNumber(payload.newQtyGal);
      const parts: string[] = [];
      if (usedDeltaGal !== undefined) parts.push(`-${usedDeltaGal} gal`);
      if (newQtyGal !== undefined) parts.push(`${newQtyGal} gal remaining`);
      return parts.length > 0 ? parts.join(' -> ') : undefined;
    }
    case 'job_context_changed': {
      const jobId = getString(payload.jobId);
      return jobId ? `Job ${jobId}` : 'Job cleared';
    }
    case 'marked_empty':
      return '0 gal remaining';
    case 'damaged_flagged':
      return 'Moved to hold';
    case 'discarded':
      return 'Removed from active inventory';
    case 'note_added':
      return undefined;
    case 'qty_corrected': {
      const newQty = getNumber(payload.newQtyGal) ?? getNumber(payload.correctedQtyGal);
      return newQty !== undefined ? `${newQty} gal` : undefined;
    }
    case 'status_corrected': {
      const status = getString(payload.status);
      return status ? `Status ${status}` : undefined;
    }
  }
}
