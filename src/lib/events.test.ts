import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { labelForType, writeEvent } from './events';
import {
  clearAll,
  getTote,
  listEventsForTote,
  putTote,
} from '../db/repo';
import type { Tote } from '../types';

function makeTote(over: Partial<Tote> = {}): Tote {
  return {
    id: 'RH-260414-001',
    productId: 'prod-a',
    status: 'in_yard',
    location: { kind: 'yard' },
    capacityGal: 330,
    currentQtyGal: 330,
    receivedAt: '2026-04-14T00:00:00.000Z',
    createdBy: 'jacob',
    syncState: 'synced',
    updatedAt: '2026-04-14T00:00:00.000Z',
    updatedBy: 'jacob',
    updatedLabel: 'Received',
    ...over,
  };
}

beforeEach(async () => {
  await clearAll();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('writeEvent', () => {
  it('appends an event and persists the updated tote in one call', async () => {
    const tote = makeTote();
    await putTote(tote);

    const { tote: updated, event } = await writeEvent({
      tote,
      type: 'assigned_to_unit',
      payload: { unitId: 'u1' },
      createdBy: 'jacob',
      toteUpdates: {
        status: 'assigned_to_unit',
        location: { kind: 'unit', unitId: 'u1' },
      },
    });

    // Tote is updated in place
    expect(updated.status).toBe('assigned_to_unit');
    expect(updated.location).toEqual({ kind: 'unit', unitId: 'u1' });

    // Persisted record matches
    const fromDb = await getTote(tote.id);
    expect(fromDb?.status).toBe('assigned_to_unit');
    expect(fromDb?.location).toEqual({ kind: 'unit', unitId: 'u1' });

    // Event is in the log
    const events = await listEventsForTote(tote.id);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(event.id);
    expect(events[0].type).toBe('assigned_to_unit');
    expect(events[0].payload).toEqual({ unitId: 'u1' });
  });

  it('stamps updatedAt, updatedBy, and updatedLabel on the tote', async () => {
    const tote = makeTote({ updatedBy: 'old-user', updatedLabel: 'Received' });
    await putTote(tote);

    const before = Date.now();
    const { tote: updated } = await writeEvent({
      tote,
      type: 'marked_empty',
      payload: {},
      createdBy: 'jacob',
      toteUpdates: { status: 'empty', currentQtyGal: 0 },
    });
    const after = Date.now();

    expect(updated.updatedBy).toBe('jacob');
    // Default label comes from labelForType
    expect(updated.updatedLabel).toBe('Marked empty');
    const ts = new Date(updated.updatedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('honors an explicit updatedLabel override', async () => {
    const tote = makeTote();
    await putTote(tote);
    const { tote: updated } = await writeEvent({
      tote,
      type: 'note_added',
      payload: { text: 'hi' },
      createdBy: 'jacob',
      updatedLabel: 'Inspection note',
    });
    expect(updated.updatedLabel).toBe('Inspection note');
  });

  it('marks the tote + event as pending when offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });

    const tote = makeTote();
    await putTote(tote);
    const { tote: updated, event } = await writeEvent({
      tote,
      type: 'note_added',
      payload: {},
      createdBy: 'jacob',
    });

    expect(event.synced).toBe(false);
    expect(updated.syncState).toBe('pending');
    const fromDb = await getTote(tote.id);
    expect(fromDb?.syncState).toBe('pending');
  });

  it('marks the tote + event as synced when online', async () => {
    vi.stubGlobal('navigator', { onLine: true });

    const tote = makeTote({ syncState: 'pending' });
    await putTote(tote);
    const { tote: updated, event } = await writeEvent({
      tote,
      type: 'note_added',
      payload: {},
      createdBy: 'jacob',
    });

    expect(event.synced).toBe(true);
    expect(updated.syncState).toBe('synced');
  });

  it('does not mutate the input tote object', async () => {
    const tote = makeTote();
    await putTote(tote);
    const snapshot = { ...tote, location: { ...tote.location } };

    await writeEvent({
      tote,
      type: 'usage_recorded',
      payload: { usedGal: 50 },
      createdBy: 'jacob',
      toteUpdates: { currentQtyGal: 280 },
    });

    // Original object untouched — writeEvent returns a new one
    expect(tote).toEqual(snapshot);
  });
});

describe('labelForType', () => {
  it('returns a human-readable label for every event type', () => {
    const samples: Array<[Parameters<typeof labelForType>[0], string]> = [
      ['received', 'Received'],
      ['assigned_to_unit', 'Assigned to unit'],
      ['transferred', 'Transferred'],
      ['returned_to_yard', 'Returned to yard'],
      ['usage_recorded', 'Usage recorded'],
      ['job_context_changed', 'Job changed'],
      ['marked_empty', 'Marked empty'],
      ['damaged_flagged', 'Flagged damaged'],
      ['discarded', 'Discarded'],
      ['note_added', 'Note added'],
      ['qty_corrected', 'Quantity corrected'],
      ['status_corrected', 'Status corrected'],
    ];
    for (const [type, expected] of samples) {
      expect(labelForType(type)).toBe(expected);
    }
  });
});
