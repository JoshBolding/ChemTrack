// Sync worker. Drains unsynced events from IndexedDB into Supabase.
//
// Runs in three situations:
//   1. On startup (once the app is loaded)
//   2. Whenever the browser fires the `online` event
//   3. On a gentle interval while online (safety net)
//
// No-ops when:
//   - Supabase credentials aren't configured (POC running standalone)
//   - The browser is offline
//   - No one is signed in (RLS would reject the insert anyway)
//
// Strategy: for every pending event, upsert the current tote row and then
// insert the event. On success, flip the event's `synced` flag locally and
// drop the tote's `syncState` back to 'synced' if it has no more pending
// events. On failure, record the error on the event and move on; the next
// tick will retry.

import { getSupabase } from '../db/supabase';
import {
  countPendingEventsForTote,
  getTote,
  listPendingEvents,
  markEventSynced,
  putTote,
} from '../db/repo';
import type { Tote, ToteEvent } from '../types';

const POLL_INTERVAL_MS = 30_000;

type WorkerState = {
  running: boolean;
  intervalId: ReturnType<typeof setInterval> | null;
  onlineHandler: (() => void) | null;
};

const state: WorkerState = {
  running: false,
  intervalId: null,
  onlineHandler: null,
};

export interface DrainResult {
  pushed: number;
  failed: number;
  skippedReason?: 'no-supabase' | 'offline' | 'no-session';
}

export function startSyncWorker(): void {
  if (state.running) return;
  state.running = true;

  const onOnline = () => {
    void drainOnce();
  };
  state.onlineHandler = onOnline;
  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
  }

  state.intervalId = setInterval(() => {
    void drainOnce();
  }, POLL_INTERVAL_MS);

  // Kick off once immediately.
  void drainOnce();
}

export function stopSyncWorker(): void {
  if (!state.running) return;
  state.running = false;
  if (state.intervalId) clearInterval(state.intervalId);
  state.intervalId = null;
  if (state.onlineHandler && typeof window !== 'undefined') {
    window.removeEventListener('online', state.onlineHandler);
  }
  state.onlineHandler = null;
}

// Single drain pass. Exported for tests and manual "Retry Now" buttons.
export async function drainOnce(): Promise<DrainResult> {
  const sb = getSupabase();
  if (!sb) return { pushed: 0, failed: 0, skippedReason: 'no-supabase' };

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { pushed: 0, failed: 0, skippedReason: 'offline' };
  }

  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) {
    return { pushed: 0, failed: 0, skippedReason: 'no-session' };
  }

  const pending = await listPendingEvents();
  if (pending.length === 0) return { pushed: 0, failed: 0 };

  let pushed = 0;
  let failed = 0;

  for (const event of pending) {
    try {
      const tote = await getTote(event.toteId);
      if (tote) {
        const { error: toteErr } = await sb
          .from('totes')
          .upsert(toDbTote(tote), { onConflict: 'id' });
        if (toteErr) throw new Error(`tote upsert: ${toteErr.message}`);
      }

      const { error: eventErr } = await sb
        .from('tote_events')
        .insert(toDbEvent(event));
      if (eventErr) throw new Error(`event insert: ${eventErr.message}`);

      await markEventSynced(event.id);
      pushed++;

      // If this was the last pending event for the tote, flip the denorm
      // syncState back to 'synced' so the UI badge reflects reality.
      const stillPending = await countPendingEventsForTote(event.toteId);
      if (stillPending === 0 && tote) {
        await putTote({ ...tote, syncState: 'synced' });
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      await markEventSynced(event.id, message);
      const tote = await getTote(event.toteId);
      if (tote) await putTote({ ...tote, syncState: 'error' });
    }
  }

  return { pushed, failed };
}

// ----- client → DB shape transforms --------------------------------------

function toDbTote(t: Tote): Record<string, unknown> {
  return {
    id: t.id,
    product_id: t.productId,
    status: t.status,
    location_kind: t.location.kind,
    location_unit_id: t.location.unitId ?? null,
    job_id: t.jobId ?? null,
    current_qty_gal: t.currentQtyGal,
    received_at: t.receivedAt,
    created_by: t.createdBy,
    updated_at: t.updatedAt,
    updated_by: t.updatedBy,
    updated_label: t.updatedLabel ?? null,
  };
}

function toDbEvent(e: ToteEvent): Record<string, unknown> {
  return {
    id: e.id,
    tote_id: e.toteId,
    type: e.type,
    payload: e.payload,
    created_at: e.createdAt,
    created_by: e.createdBy,
  };
}
