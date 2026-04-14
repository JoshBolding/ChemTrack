// Status-aware action resolution. Given a tote's current status, return
// the list of actions that make sense. This is what powers the dynamic
// action buttons on the Tote Detail screen.

import type { Tote, ToteStatus } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';

export interface ToteAction {
  id: string;
  label: string;
  to: string; // route path relative to tote detail
  tone?: 'primary' | 'secondary' | 'danger';
}

export function actionsForStatus(status: ToteStatus, toteId: string): ToteAction[] {
  const base = `/tote/${encodeURIComponent(toteId)}`;
  switch (status) {
    case 'in_yard':
      return [
        { id: 'assign', label: 'Assign to Unit', to: `${base}/assign`, tone: 'primary' },
        { id: 'note', label: 'Add Note', to: `${base}/note`, tone: 'secondary' },
      ];
    case 'assigned_to_unit':
      return [
        { id: 'usage', label: 'Record Usage', to: `${base}/usage`, tone: 'primary' },
        { id: 'job', label: 'Change Job', to: `${base}/job`, tone: 'secondary' },
        { id: 'transfer', label: 'Transfer to Unit', to: `${base}/transfer`, tone: 'secondary' },
        { id: 'return', label: 'Return to Yard', to: `${base}/return`, tone: 'secondary' },
        { id: 'empty', label: 'Mark Empty', to: `${base}/empty`, tone: 'secondary' },
      ];
    case 'empty':
      return [
        { id: 'discard', label: 'Discard Tote', to: `${base}/discard`, tone: 'danger' },
        { id: 'note', label: 'Add Note', to: `${base}/note`, tone: 'secondary' },
      ];
    case 'hold':
      return [
        { id: 'note', label: 'Add Note', to: `${base}/note`, tone: 'secondary' },
      ];
    case 'discarded':
      return [];
  }
}

export function isPartial(t: Tote): boolean {
  return t.currentQtyGal > 0 && t.currentQtyGal < TOTE_CAPACITY_GAL;
}

export function isFull(t: Tote): boolean {
  return t.currentQtyGal >= TOTE_CAPACITY_GAL;
}
