import { getDB } from './schema';
import type {
  Product,
  Tote,
  ToteEvent,
  Unit,
  Job,
  ToteStatus,
} from '../types';

// ---------- Products ----------
export async function listProducts(): Promise<Product[]> {
  return (await getDB()).getAll('products');
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return (await getDB()).get('products', id);
}

export async function putProduct(p: Product): Promise<void> {
  await (await getDB()).put('products', p);
}

// ---------- Units ----------
export async function listUnits(activeOnly = false): Promise<Unit[]> {
  const all = await (await getDB()).getAll('units');
  return activeOnly ? all.filter((u) => u.active) : all;
}

export async function getUnit(id: string): Promise<Unit | undefined> {
  return (await getDB()).get('units', id);
}

export async function putUnit(u: Unit): Promise<void> {
  await (await getDB()).put('units', u);
}

// ---------- Jobs ----------
export async function listJobs(activeOnly = false): Promise<Job[]> {
  const all = await (await getDB()).getAll('jobs');
  return activeOnly ? all.filter((j) => j.active) : all;
}

export async function getJob(id: string): Promise<Job | undefined> {
  return (await getDB()).get('jobs', id);
}

export async function putJob(j: Job): Promise<void> {
  await (await getDB()).put('jobs', j);
}

// ---------- Totes ----------
export async function listTotes(): Promise<Tote[]> {
  return (await getDB()).getAll('totes');
}

export async function listTotesByStatus(status: ToteStatus): Promise<Tote[]> {
  return (await getDB()).getAllFromIndex('totes', 'by-status', status);
}

export async function getTote(id: string): Promise<Tote | undefined> {
  return (await getDB()).get('totes', id);
}

export async function putTote(t: Tote): Promise<void> {
  await (await getDB()).put('totes', t);
}

// ---------- Events ----------
export async function listEventsForTote(toteId: string): Promise<ToteEvent[]> {
  const all = await (await getDB()).getAllFromIndex(
    'events',
    'by-tote',
    toteId
  );
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listEvents(): Promise<ToteEvent[]> {
  const all = await (await getDB()).getAll('events');
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function appendEvent(e: ToteEvent): Promise<void> {
  await (await getDB()).put('events', e);
}

export async function countPendingEvents(): Promise<number> {
  const all = await (await getDB()).getAll('events');
  return all.filter((e) => !e.synced).length;
}

// ---------- Utilities ----------
export async function clearAll(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('products'),
    db.clear('units'),
    db.clear('jobs'),
    db.clear('totes'),
    db.clear('events'),
  ]);
}
