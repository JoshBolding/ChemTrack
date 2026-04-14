import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendEvent,
  clearAll,
  countPendingEvents,
  getJob,
  getProduct,
  getTote,
  getUnit,
  listEventsForTote,
  listJobs,
  listProducts,
  listTotes,
  listTotesByStatus,
  listUnits,
  putJob,
  putProduct,
  putTote,
  putUnit,
} from './repo';
import type { Job, Product, Tote, ToteEvent, Unit } from '../types';

function makeProduct(over: Partial<Product> = {}): Product {
  return { id: 'prod-a', name: 'Product A', ...over };
}

function makeUnit(over: Partial<Unit> = {}): Unit {
  return { id: 'unit-1', name: 'Unit 1', active: true, ...over };
}

function makeJob(over: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    name: 'Job 1',
    customer: 'ACME',
    active: true,
    ...over,
  };
}

function makeTote(over: Partial<Tote> = {}): Tote {
  return {
    id: 'RH-260414-001',
    productId: 'prod-a',
    status: 'in_yard',
    location: { kind: 'yard' },
    currentQtyGal: 330,
    receivedAt: '2026-04-14T00:00:00.000Z',
    createdBy: 'test',
    syncState: 'synced',
    updatedAt: '2026-04-14T00:00:00.000Z',
    updatedBy: 'test',
    ...over,
  };
}

function makeEvent(over: Partial<ToteEvent> = {}): ToteEvent {
  return {
    id: 'evt-1',
    toteId: 'RH-260414-001',
    type: 'received',
    createdAt: '2026-04-14T00:00:00.000Z',
    createdBy: 'test',
    payload: {},
    synced: true,
    ...over,
  };
}

beforeEach(async () => {
  await clearAll();
});

describe('products', () => {
  it('put / get / list roundtrip', async () => {
    await putProduct(makeProduct({ id: 'a', name: 'Alpha' }));
    await putProduct(makeProduct({ id: 'b', name: 'Bravo' }));
    expect(await getProduct('a')).toMatchObject({ id: 'a', name: 'Alpha' });
    const list = (await listProducts()).sort((x, y) =>
      x.id.localeCompare(y.id),
    );
    expect(list.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('getProduct returns undefined for missing id', async () => {
    expect(await getProduct('missing')).toBeUndefined();
  });
});

describe('units', () => {
  it('listUnits(true) filters to active only', async () => {
    await putUnit(makeUnit({ id: 'u1', active: true }));
    await putUnit(makeUnit({ id: 'u2', active: false }));
    const all = await listUnits();
    expect(all).toHaveLength(2);
    const active = await listUnits(true);
    expect(active.map((u) => u.id)).toEqual(['u1']);
  });

  it('getUnit returns the stored unit', async () => {
    await putUnit(makeUnit({ id: 'u1', name: 'North' }));
    expect(await getUnit('u1')).toMatchObject({ id: 'u1', name: 'North' });
  });
});

describe('jobs', () => {
  it('listJobs(true) filters to active only', async () => {
    await putJob(makeJob({ id: 'j1', active: true }));
    await putJob(makeJob({ id: 'j2', active: false }));
    const active = await listJobs(true);
    expect(active.map((j) => j.id)).toEqual(['j1']);
  });

  it('getJob returns undefined for missing id', async () => {
    expect(await getJob('nope')).toBeUndefined();
  });
});

describe('totes', () => {
  it('put / get / list roundtrip', async () => {
    await putTote(makeTote({ id: 'RH-260414-001' }));
    await putTote(makeTote({ id: 'RH-260414-002' }));
    const all = await listTotes();
    expect(all.map((t) => t.id).sort()).toEqual([
      'RH-260414-001',
      'RH-260414-002',
    ]);
    const t = await getTote('RH-260414-001');
    expect(t?.productId).toBe('prod-a');
  });

  it('listTotesByStatus uses the by-status index', async () => {
    await putTote(makeTote({ id: 'A', status: 'in_yard' }));
    await putTote(
      makeTote({
        id: 'B',
        status: 'assigned_to_unit',
        location: { kind: 'unit', unitId: 'u1' },
      }),
    );
    await putTote(makeTote({ id: 'C', status: 'in_yard' }));
    const inYard = await listTotesByStatus('in_yard');
    expect(inYard.map((t) => t.id).sort()).toEqual(['A', 'C']);
    const assigned = await listTotesByStatus('assigned_to_unit');
    expect(assigned.map((t) => t.id)).toEqual(['B']);
  });

  it('putTote overwrites existing record with same id', async () => {
    await putTote(makeTote({ id: 'A', currentQtyGal: 330 }));
    await putTote(makeTote({ id: 'A', currentQtyGal: 150 }));
    const t = await getTote('A');
    expect(t?.currentQtyGal).toBe(150);
  });
});

describe('events', () => {
  it('appendEvent + listEventsForTote returns events sorted newest-first', async () => {
    await appendEvent(
      makeEvent({
        id: 'e1',
        toteId: 'A',
        createdAt: '2026-04-14T00:00:00.000Z',
      }),
    );
    await appendEvent(
      makeEvent({
        id: 'e2',
        toteId: 'A',
        createdAt: '2026-04-14T02:00:00.000Z',
      }),
    );
    await appendEvent(
      makeEvent({
        id: 'e3',
        toteId: 'A',
        createdAt: '2026-04-14T01:00:00.000Z',
      }),
    );
    const list = await listEventsForTote('A');
    expect(list.map((e) => e.id)).toEqual(['e2', 'e3', 'e1']);
  });

  it('listEventsForTote scopes by toteId', async () => {
    await appendEvent(makeEvent({ id: 'e1', toteId: 'A' }));
    await appendEvent(makeEvent({ id: 'e2', toteId: 'B' }));
    const a = await listEventsForTote('A');
    const b = await listEventsForTote('B');
    expect(a.map((e) => e.id)).toEqual(['e1']);
    expect(b.map((e) => e.id)).toEqual(['e2']);
  });

  it('countPendingEvents counts only events where synced = false', async () => {
    await appendEvent(makeEvent({ id: 'e1', synced: true }));
    await appendEvent(makeEvent({ id: 'e2', synced: false }));
    await appendEvent(makeEvent({ id: 'e3', synced: false }));
    expect(await countPendingEvents()).toBe(2);
  });
});

describe('clearAll', () => {
  it('wipes every store', async () => {
    await putProduct(makeProduct());
    await putUnit(makeUnit());
    await putJob(makeJob());
    await putTote(makeTote());
    await appendEvent(makeEvent());
    await clearAll();
    expect(await listProducts()).toEqual([]);
    expect(await listUnits()).toEqual([]);
    expect(await listJobs()).toEqual([]);
    expect(await listTotes()).toEqual([]);
    expect(await countPendingEvents()).toBe(0);
  });
});
