// ChemTrack V1 data model
// Statuses, locations, and job context are kept strictly separate —
// each field carries one meaning only.

export const TOTE_CAPACITY_GAL = 330;

// ---------- Status (lifecycle only) ----------
export type ToteStatus =
  | 'in_yard'
  | 'assigned_to_unit'
  | 'empty'
  | 'hold'
  | 'discarded';

export const TOTE_STATUS_LABELS: Record<ToteStatus, string> = {
  in_yard: 'In Yard',
  assigned_to_unit: 'Assigned to Unit',
  empty: 'Empty',
  hold: 'Hold',
  discarded: 'Discarded',
};

// ---------- Location (physical) ----------
// Either the yard, a specific unit, or a hold/inspection bay.
// Stored as a kind + optional unit id.
export type LocationKind = 'yard' | 'unit' | 'hold';

export interface ToteLocation {
  kind: LocationKind;
  unitId?: string; // only present when kind === 'unit'
}

// ---------- Core entities ----------
export interface Product {
  id: string;
  name: string;
  // capacityGal is fixed at TOTE_CAPACITY_GAL for V1 — field reserved for future variability.
}

export interface Unit {
  id: string;
  name: string;
  region?: string;
  supervisor?: string;
  active: boolean;
}

export interface Job {
  id: string;
  name: string;
  customer: string;
  region?: string;
  active: boolean;
}

export interface Tote {
  id: string; // e.g. RH-250414-007
  productId: string;
  status: ToteStatus;
  location: ToteLocation;
  jobId?: string; // optional active job context
  currentQtyGal: number;
  receivedAt: string; // ISO timestamp
  createdBy: string;
  // Sync state is per-record, derived from pending events touching this tote.
  // Stored here for quick UI badge lookup; recomputed after each event write.
  syncState: 'synced' | 'pending' | 'error';
  // Denormalized last-updated for quick display in lists.
  updatedAt: string;
  updatedBy: string;
  updatedLabel?: string; // e.g. "Usage recorded"
}

// ---------- Events (append-only log) ----------
export type EventType =
  | 'received'
  | 'assigned_to_unit'
  | 'transferred'
  | 'returned_to_yard'
  | 'usage_recorded'
  | 'job_context_changed'
  | 'marked_empty'
  | 'damaged_flagged'
  | 'discarded'
  | 'note_added'
  | 'qty_corrected'
  | 'status_corrected';

export interface ToteEvent {
  id: string; // uuid/client-generated
  toteId: string;
  type: EventType;
  createdAt: string; // ISO timestamp (client clock)
  createdBy: string;
  // Payload is type-specific; kept loose for simplicity.
  payload: Record<string, unknown>;
  // Offline sync metadata
  synced: boolean;
  syncError?: string;
}

// ---------- Exception codes ----------
export type ExceptionCode =
  | 'qty_negative'
  | 'qty_over_capacity'
  | 'usage_on_discarded'
  | 'usage_on_empty'
  | 'inactive_unit'
  | 'inactive_job'
  | 'pending_sync_stale'
  | 'scanned_not_in_snapshot'
  | 'return_without_assignment';

export interface Exception {
  code: ExceptionCode;
  severity: 'info' | 'warn' | 'error';
  message: string;
  toteId?: string;
}
