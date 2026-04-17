// ChemTrack V2 data model
// Statuses, locations, and job context are kept strictly separate —
// each field carries one meaning only.

// Default capacity used for new product templates and seed fallback.
// Per-tote capacity is now stored on the Tote itself (totes can be 250, 275, 330, etc).
export const DEFAULT_TOTE_CAPACITY_GAL = 330;

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
export type LocationKind = 'yard' | 'unit' | 'hold';

export interface ToteLocation {
  kind: LocationKind;
  unitId?: string;
}

// ---------- Products (chemicals) ----------
export type ProductCategory =
  | 'corrosion_inhibitor'
  | 'scale_inhibitor'
  | 'biocide'
  | 'friction_reducer'
  | 'foamer'
  | 'surfactant'
  | 'other';

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  corrosion_inhibitor: 'Corrosion Inhibitor',
  scale_inhibitor: 'Scale Inhibitor',
  biocide: 'Biocide',
  friction_reducer: 'Friction Reducer',
  foamer: 'Foamer',
  surfactant: 'Surfactant',
  other: 'Other',
};

export interface Product {
  id: string;
  name: string;
  // Required: every chemical has a density used for weight↔volume conversion
  // and a default tote size used as the receive-form default.
  densityLbPerGal: number;
  defaultToteCapacityGal: number;
  category?: ProductCategory;
  manufacturer?: string;
  // Reorder alert: surface a warning when total on-hand falls below this.
  reorderThresholdGal?: number;
  // Optional cost tracking (not surfaced in V2 UI but stored for later).
  costPerGal?: number;
  // OSHA: link to the Safety Data Sheet for this chemical.
  sdsUrl?: string;
}

// ---------- Units / Jobs ----------
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

// ---------- Receiving condition ----------
export type ToteCondition = 'good' | 'damaged' | 'leaking' | 'seal_broken';

export const TOTE_CONDITION_LABELS: Record<ToteCondition, string> = {
  good: 'Good',
  damaged: 'Damaged',
  leaking: 'Leaking',
  seal_broken: 'Seal Broken',
};

// ---------- Totes ----------
export interface Tote {
  id: string; // e.g. RH-250414-007
  productId: string;
  status: ToteStatus;
  location: ToteLocation;
  jobId?: string;

  // Quantity is per-tote: capacity comes from the actual container, not a global.
  capacityGal: number;
  currentQtyGal: number;

  // Receiving / traceability metadata. Optional because legacy records may
  // not have it, but the new Receive flow always populates these.
  lotNumber?: string;
  expiresAt?: string; // ISO date
  vendorBol?: string; // BOL / PO reference
  vendor?: string; // shipping vendor / supplier name
  tareWeightLb?: number; // empty container weight, for weigh-to-measure
  conditionOnArrival?: ToteCondition;

  receivedAt: string;
  createdBy: string;
  syncState: 'synced' | 'pending' | 'error';
  updatedAt: string;
  updatedBy: string;
  updatedLabel?: string;
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
  id: string;
  toteId: string;
  type: EventType;
  createdAt: string;
  createdBy: string;
  payload: Record<string, unknown>;
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
