import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// Shared mock state — must be hoisted so vi.mock() below can reach it.
const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  insert: vi.fn(),
  getSession: vi.fn(),
  client: null as unknown,
}));

vi.mock('../db/supabase', () => ({
  getSupabase: () => mocks.client,
  hasSupabase: () => Boolean(mocks.client),
}));

import { drainOnce } from './syncWorker';
import {
  appendEvent,
  clearAll,
  getTote,
  listPendingEvents,
  putTote,
} from '../db/repo';
import type { Tote, ToteEvent } from '../types';

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
    syncState: 'pending',
    updatedAt: '2026-04-14T00:00:00.000Z',
    updatedBy: 'jacob',
    ...over,
  };
}

function makeEvent(over: Partial<ToteEvent> = {}): ToteEvent {
  return {
    id: 'evt-1',
    toteId: 'RH-260414-001',
    type: 'note_added',
    createdAt: '2026-04-14T00:00:00.000Z',
    createdBy: 'jacob',
    payload: { note: 'hello' },
    synced: false,
    ...over,
  };
}

function makeFakeClient() {
  return {
    auth: { getSession: mocks.getSession },
    from: () => ({
      upsert: mocks.upsert,
      insert: mocks.insert,
    }),
  };
}

beforeEach(async () => {
  await clearAll();
  mocks.upsert.mockReset();
  mocks.insert.mockReset();
  mocks.getSession.mockReset();
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.getSession.mockResolvedValue({
    data: { session: { user: { id: 'u1' } } },
  });
  mocks.client = makeFakeClient();
});

afterEach(() => {
  vi.unstubAllGlobals();
  mocks.client = null;
});

describe('drainOnce — guards', () => {
  it('skips when supabase is not configured', async () => {
    mocks.client = null;
    const result = await drainOnce();
    expect(result.skippedReason).toBe('no-supabase');
    expect(result.pushed).toBe(0);
  });

  it('skips when the browser is offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const result = await drainOnce();
    expect(result.skippedReason).toBe('offline');
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it('skips when no user session is present', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    const result = await drainOnce();
    expect(result.skippedReason).toBe('no-session');
  });

  it('returns zero pushed when nothing is pending', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    const result = await drainOnce();
    expect(result).toEqual({ pushed: 0, failed: 0 });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe('drainOnce — happy path', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true });
  });

  it('pushes one pending event and marks it synced', async () => {
    await putTote(makeTote());
    await appendEvent(makeEvent({ synced: false }));
    const result = await drainOnce();
    expect(result.pushed).toBe(1);
    expect(result.failed).toBe(0);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(await listPendingEvents()).toEqual([]);
  });

  it('flips the tote syncState back to synced once all events drain', async () => {
    await putTote(makeTote({ syncState: 'pending' }));
    await appendEvent(makeEvent({ id: 'e1', synced: false }));
    await appendEvent(makeEvent({ id: 'e2', synced: false }));
    await drainOnce();
    const fromDb = await getTote('RH-260414-001');
    expect(fromDb?.syncState).toBe('synced');
  });

  it('pushes events in oldest-first order', async () => {
    await putTote(makeTote());
    await appendEvent(
      makeEvent({
        id: 'e2',
        synced: false,
        createdAt: '2026-04-14T02:00:00.000Z',
      }),
    );
    await appendEvent(
      makeEvent({
        id: 'e1',
        synced: false,
        createdAt: '2026-04-14T01:00:00.000Z',
      }),
    );
    await drainOnce();
    const pushedIds = mocks.insert.mock.calls.map(
      (c: unknown[]) => (c[0] as { id: string }).id,
    );
    expect(pushedIds).toEqual(['e1', 'e2']);
  });

  it('transforms client fields to snake_case for the DB', async () => {
    await putTote(
      makeTote({
        productId: 'prod-x',
        location: { kind: 'unit', unitId: 'u3' },
        jobId: 'j1',
      }),
    );
    await appendEvent(makeEvent({ synced: false }));
    await drainOnce();
    const [toteRow] = mocks.upsert.mock.calls[0];
    expect(toteRow).toMatchObject({
      id: 'RH-260414-001',
      product_id: 'prod-x',
      location_kind: 'unit',
      location_unit_id: 'u3',
      job_id: 'j1',
    });
    const [eventRow] = mocks.insert.mock.calls[0];
    expect(eventRow).toMatchObject({
      id: 'evt-1',
      tote_id: 'RH-260414-001',
      type: 'note_added',
    });
  });
});

describe('drainOnce — error handling', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true });
  });

  it('records syncError when the server rejects the event', async () => {
    await putTote(makeTote());
    await appendEvent(makeEvent({ synced: false }));
    mocks.insert.mockResolvedValue({
      error: { message: 'duplicate key' },
    });
    const result = await drainOnce();
    expect(result.pushed).toBe(0);
    expect(result.failed).toBe(1);
    const pending = await listPendingEvents();
    expect(pending).toHaveLength(1);
    expect(pending[0].syncError).toContain('duplicate key');
  });

  it('marks the tote as error when its event push fails', async () => {
    await putTote(makeTote({ syncState: 'pending' }));
    await appendEvent(makeEvent({ synced: false }));
    mocks.upsert.mockResolvedValue({
      error: { message: 'RLS denied' },
    });
    await drainOnce();
    const fromDb = await getTote('RH-260414-001');
    expect(fromDb?.syncState).toBe('error');
  });

  it('keeps draining after a single failure', async () => {
    await putTote(makeTote({ id: 'A' }));
    await putTote(makeTote({ id: 'B' }));
    await appendEvent(makeEvent({ id: 'e1', toteId: 'A', synced: false }));
    await appendEvent(makeEvent({ id: 'e2', toteId: 'B', synced: false }));
    // First call fails, second succeeds
    mocks.insert
      .mockResolvedValueOnce({ error: { message: 'boom' } })
      .mockResolvedValue({ error: null });
    const result = await drainOnce();
    expect(result.pushed).toBe(1);
    expect(result.failed).toBe(1);
  });
});
