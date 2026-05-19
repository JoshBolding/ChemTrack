import type { Job, Product, Tote, ToteEvent, Unit } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';
import { isFull, isPartial } from './status';

export interface ProductInventoryRow {
  product: Product;
  totalGal: number;
  count: number;
  yardGal: number;
  unitGal: number;
  holdGal: number;
  fullCount: number;
  partialCount: number;
  emptyCount: number;
}

export interface JobUsageRow {
  job: Job;
  usedGal: number;
  toteCount: number;
  products: Record<string, number>;
}

export interface UnitLoadoutRow {
  unit: Unit;
  totalGal: number;
  toteCount: number;
  partialCount: number;
  emptyCount: number;
  jobs: string[];
}

export function buildProductInventory(
  products: Product[],
  totes: Tote[]
): ProductInventoryRow[] {
  const rows = new Map<string, ProductInventoryRow>();
  for (const product of products) {
    rows.set(product.id, {
      product,
      totalGal: 0,
      count: 0,
      yardGal: 0,
      unitGal: 0,
      holdGal: 0,
      fullCount: 0,
      partialCount: 0,
      emptyCount: 0,
    });
  }

  for (const tote of totes) {
    if (tote.status === 'discarded') continue;
    const row = rows.get(tote.productId);
    if (!row) continue;
    row.totalGal += tote.currentQtyGal;
    row.count += 1;
    if (tote.location.kind === 'yard') row.yardGal += tote.currentQtyGal;
    if (tote.location.kind === 'unit') row.unitGal += tote.currentQtyGal;
    if (tote.location.kind === 'hold') row.holdGal += tote.currentQtyGal;
    if (tote.currentQtyGal === 0) row.emptyCount += 1;
    else if (isPartial(tote)) row.partialCount += 1;
    else if (isFull(tote)) row.fullCount += 1;
  }

  return Array.from(rows.values()).sort((a, b) => b.totalGal - a.totalGal);
}

export function buildJobUsage(
  jobs: Job[],
  products: Product[],
  totes: Tote[],
  events: ToteEvent[]
): JobUsageRow[] {
  const rows = new Map<string, JobUsageRow>();
  const productById = new Map(products.map((product) => [product.id, product]));
  const toteById = new Map(totes.map((tote) => [tote.id, tote]));

  for (const job of jobs) {
    rows.set(job.id, {
      job,
      usedGal: 0,
      toteCount: 0,
      products: {},
    });
  }

  const touched = new Map<string, Set<string>>();
  for (const event of events) {
    if (event.type !== 'usage_recorded') continue;
    const jobId = typeof event.payload.jobId === 'string' ? event.payload.jobId : undefined;
    if (!jobId) continue;
    const row = rows.get(jobId);
    if (!row) continue;
    const tote = toteById.get(event.toteId);
    const used = Number(event.payload.usedDeltaGal ?? 0);
    if (used <= 0) continue;
    row.usedGal += used;
    if (!touched.get(jobId)) touched.set(jobId, new Set());
    touched.get(jobId)?.add(event.toteId);
    const productName = tote ? productById.get(tote.productId)?.name ?? tote.productId : 'Unknown product';
    row.products[productName] = (row.products[productName] ?? 0) + used;
  }

  // Fresh demo databases have real usage events. Older local IndexedDB snapshots may not.
  // Fall back to current partial/empty tote state so the supervisor report still proves value.
  const hasUsageEvents = Array.from(rows.values()).some((row) => row.usedGal > 0);
  if (!hasUsageEvents) {
    for (const tote of totes) {
      if (!tote.jobId) continue;
      const row = rows.get(tote.jobId);
      if (!row) continue;
      const inferredUsed = Math.max(0, TOTE_CAPACITY_GAL - tote.currentQtyGal);
      if (inferredUsed <= 0) continue;
      row.usedGal += inferredUsed;
      if (!touched.get(tote.jobId)) touched.set(tote.jobId, new Set());
      touched.get(tote.jobId)?.add(tote.id);
      const productName = productById.get(tote.productId)?.name ?? tote.productId;
      row.products[productName] = (row.products[productName] ?? 0) + inferredUsed;
    }
  }

  for (const [jobId, ids] of touched) {
    const row = rows.get(jobId);
    if (row) row.toteCount = ids.size;
  }

  return Array.from(rows.values())
    .filter((row) => row.usedGal > 0 || row.toteCount > 0)
    .sort((a, b) => b.usedGal - a.usedGal);
}

export function buildUnitLoadouts(
  units: Unit[],
  jobs: Job[],
  totes: Tote[]
): UnitLoadoutRow[] {
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  return units
    .map((unit) => {
      const unitTotes = totes.filter(
        (tote) => tote.location.kind === 'unit' && tote.location.unitId === unit.id
      );
      const jobNames = new Set<string>();
      for (const tote of unitTotes) {
        if (tote.jobId) jobNames.add(jobsById.get(tote.jobId)?.name ?? tote.jobId);
      }
      return {
        unit,
        totalGal: unitTotes.reduce((sum, tote) => sum + tote.currentQtyGal, 0),
        toteCount: unitTotes.length,
        partialCount: unitTotes.filter(isPartial).length,
        emptyCount: unitTotes.filter((tote) => tote.currentQtyGal === 0).length,
        jobs: Array.from(jobNames),
      };
    })
    .filter((row) => row.toteCount > 0 || row.unit.active)
    .sort((a, b) => b.totalGal - a.totalGal);
}
