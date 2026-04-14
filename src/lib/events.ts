// Event write helpers. Every user action funnels through writeEvent, which:
//   1. Appends an immutable event to the log
//   2. Updates the denormalized tote record transactionally
//   3. Marks the tote's sync state
//
// In V1, there is no real server. "synced: false" represents the offline queue,
// which a future sync worker will drain. For the POC we mark events synced = true
// if online, or leave pending if navigator.onLine is false.

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
