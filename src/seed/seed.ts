// Demo seed dataset. Loaded into IndexedDB on first run if the DB is empty.
// Mirrors the story from the planning phase:
//   - 14 just-received totes of Corrosion Inhibitor 47 (RH-250414-001..014)
//   - 2 totes already out on Unit 3 against Smith Energy #44
//   - a few messy cases to exercise the exception model

import type { Job, Product, Tote, ToteEvent, Unit } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';
import {
  clearAll,
  listEvents,
  listProducts,
  listTotes,
  putProduct,
  putUnit,
  putJob,
  putTote,
  appendEvent,
} from '../db/repo';
import { uuid } from '../lib/ids';

const NOW = '2026-04-14T09:00:00.000Z';
const USER = 'operator';

const products: Product[] = [
  { id: 'ci47', name: 'Corrosion Inhibitor 47' },
  { id: 'si18', name: 'Scale Inhibitor 18' },
  { id: 'fx', name: 'Foamer X' },
  { id: 'b12', name: 'Biocide B-12' },
];

const units: Unit[] = [
  { id: 'u1', name: 'Unit 1', region: 'East Texas', active: true },
  { id: 'u2', name: 'Unit 2', region: 'East Texas', active: true },
  { id: 'u3', name: 'Unit 3', region: 'West Texas / Permian', active: true },
  { id: 'u4', name: 'Unit 4', region: 'West Texas / Permian', active: true },
  { id: 'u5', name: 'Unit 5', region: 'Oklahoma', active: true },
  { id: 'u6', name: 'Unit 6', region: 'Oklahoma', active: true },
  { id: 'u7', name: 'Unit 7', region: 'North Dakota', active: true },
  { id: 'u8', name: 'Unit 8', region: 'Louisiana', active: false },
];

const jobs: Job[] = [
  { id: 'j1', name: 'Smith Energy #44', customer: 'Smith Energy', region: 'Permian Basin', active: true },
  { id: 'j2', name: 'Smith Energy #47', customer: 'Smith Energy', region: 'Permian Basin', active: true },
  { id: 'j3', name: 'Apache Eagle Ford #12', customer: 'Apache', region: 'Eagle Ford', active: true },
  { id: 'j4', name: 'Devon Anadarko #3', customer: 'Devon', region: 'Anadarko', active: true },
  { id: 'j5', name: 'Continental Bakken #8', customer: 'Continental', region: 'Bakken', active: true },
  { id: 'j6', name: 'Chevron Haynesville #5', customer: 'Chevron', region: 'Haynesville', active: true },
  { id: 'j7', name: 'Pioneer Midland #22', customer: 'Pioneer', region: 'Midland', active: true },
  { id: 'j8', name: 'Marathon Eagle Ford #9', customer: 'Marathon', region: 'Eagle Ford', active: false },
];

function makeTote(
  id: string,
  productId: string,
  status: Tote['status'],
  location: Tote['location'],
  qty: number,
  jobId: string | undefined,
  updatedLabel: string
): Tote {
  return {
    id,
    productId,
    status,
    location,
    jobId,
    currentQtyGal: qty,
    receivedAt: NOW,
    createdBy: USER,
    syncState: 'synced',
    updatedAt: NOW,
    updatedBy: USER,
    updatedLabel,
  };
}

// Build the full tote list from the planning story.
function buildTotes(): Tote[] {
  const out: Tote[] = [];

  // 14 just received — RH-250414-001..014 — all CI-47, in yard, full.
  for (let i = 1; i <= 14; i++) {
    const id = `RH-250414-${String(i).padStart(3, '0')}`;
    out.push(
      makeTote(
        id,
        'ci47',
        'in_yard',
        { kind: 'yard' },
        330,
        undefined,
        'Received'
      )
    );
  }

  // Older inventory in yard (full)
  out.push(
    makeTote('RH-250407-002', 'si18', 'in_yard', { kind: 'yard' }, 330, undefined, 'Received')
  );
  out.push(
    makeTote('RH-250407-005', 'fx', 'in_yard', { kind: 'yard' }, 330, undefined, 'Received')
  );

  // Unit 3 loaded out — 2 full + 3 partial, on Smith Energy #44
  out.push(
    makeTote('RH-250410-001', 'ci47', 'assigned_to_unit', { kind: 'unit', unitId: 'u3' }, 330, 'j1', 'Assigned to unit')
  );
  out.push(
    makeTote('RH-250410-002', 'ci47', 'assigned_to_unit', { kind: 'unit', unitId: 'u3' }, 330, 'j1', 'Assigned to unit')
  );
  out.push(
    makeTote('RH-250409-003', 'ci47', 'assigned_to_unit', { kind: 'unit', unitId: 'u3' }, 280, 'j1', 'Usage recorded')
  );
  out.push(
    makeTote('RH-250409-004', 'ci47', 'assigned_to_unit', { kind: 'unit', unitId: 'u3' }, 210, 'j1', 'Usage recorded')
  );
  out.push(
    makeTote('RH-250408-001', 'si18', 'assigned_to_unit', { kind: 'unit', unitId: 'u3' }, 120, 'j1', 'Usage recorded')
  );

  // Unit 4 — 2 full
  out.push(
    makeTote('RH-250411-001', 'fx', 'assigned_to_unit', { kind: 'unit', unitId: 'u4' }, 330, 'j7', 'Assigned to unit')
  );
  out.push(
    makeTote('RH-250411-002', 'b12', 'assigned_to_unit', { kind: 'unit', unitId: 'u4' }, 330, 'j7', 'Assigned to unit')
  );

  // Unit 5 — 1 partial
  out.push(
    makeTote('RH-250406-001', 'ci47', 'assigned_to_unit', { kind: 'unit', unitId: 'u5' }, 90, 'j4', 'Usage recorded')
  );

  // Two partials back in yard (returned earlier)
  out.push(
    makeTote('RH-250402-001', 'ci47', 'in_yard', { kind: 'yard' }, 40, undefined, 'Returned to yard')
  );
  out.push(
    makeTote('RH-250403-002', 'si18', 'in_yard', { kind: 'yard' }, 180, undefined, 'Returned to yard')
  );

  // Empty tote still on Unit 3 waiting to come back
  out.push(
    makeTote('RH-250401-007', 'ci47', 'empty', { kind: 'unit', unitId: 'u3' }, 0, 'j1', 'Marked empty')
  );

  // Two empty totes in yard awaiting discard
  out.push(
    makeTote('RH-250328-001', 'ci47', 'empty', { kind: 'yard' }, 0, undefined, 'Returned to yard')
  );
  out.push(
    makeTote('RH-250329-002', 'fx', 'empty', { kind: 'yard' }, 0, undefined, 'Returned to yard')
  );

  // Discarded historical tote (shows up in history/search)
  out.push(
    makeTote('RH-250301-001', 'ci47', 'discarded', { kind: 'yard' }, 0, undefined, 'Discarded')
  );

  // Damaged-on-arrival hold
  out.push(
    makeTote('RH-250414-099', 'b12', 'hold', { kind: 'hold' }, 330, undefined, 'Flagged damaged')
  );

  // Exception: qty over capacity (data entry error we want the app to surface)
  out.push(
    makeTote('RH-250405-099', 'si18', 'in_yard', { kind: 'yard' }, 340, undefined, 'Quantity corrected')
  );

  // Exception: references inactive unit
  out.push(
    makeTote('RH-250330-003', 'fx', 'assigned_to_unit', { kind: 'unit', unitId: 'u8' }, 330, undefined, 'Assigned to unit')
  );

  // Exception: references inactive job
  out.push({
    ...makeTote('RH-250330-004', 'ci47', 'assigned_to_unit', { kind: 'unit', unitId: 'u2' }, 200, 'j8', 'Usage recorded'),
  });

  // Pending-sync example for the UI badge
  const pending = makeTote('RH-250412-003', 'ci47', 'assigned_to_unit', { kind: 'unit', unitId: 'u3' }, 255, 'j1', 'Usage recorded');
  pending.syncState = 'pending';
  out.push(pending);

  return out;
}

function stamp(minutesAfterNow: number): string {
  return new Date(new Date(NOW).getTime() + minutesAfterNow * 60_000).toISOString();
}

function buildSeedEvents(totes: Tote[]): ToteEvent[] {
  const events: ToteEvent[] = [];

  for (const t of totes) {
    events.push({
      id: uuid(),
      toteId: t.id,
      type: 'received',
      createdAt: t.receivedAt,
      createdBy: USER,
      payload: { productId: t.productId, qty: TOTE_CAPACITY_GAL },
      synced: true,
    });

    if (t.location.kind === 'unit' && t.location.unitId) {
      events.push({
        id: uuid(),
        toteId: t.id,
        type: 'assigned_to_unit',
        createdAt: stamp(45),
        createdBy: USER,
        payload: { unitId: t.location.unitId, jobId: t.jobId ?? null, note: 'Demo loadout' },
        synced: true,
      });
    }

    if (t.currentQtyGal > 0 && t.currentQtyGal < TOTE_CAPACITY_GAL && t.jobId) {
      events.push({
        id: uuid(),
        toteId: t.id,
        type: 'usage_recorded',
        createdAt: stamp(180),
        createdBy: USER,
        payload: {
          mode: 'remaining',
          newQtyGal: t.currentQtyGal,
          usedDeltaGal: TOTE_CAPACITY_GAL - t.currentQtyGal,
          jobId: t.jobId,
          note: 'Demo usage entry',
        },
        synced: t.syncState !== 'pending',
      });
    }

    if (t.location.kind === 'yard' && t.currentQtyGal < TOTE_CAPACITY_GAL && t.status !== 'discarded') {
      events.push({
        id: uuid(),
        toteId: t.id,
        type: 'returned_to_yard',
        createdAt: stamp(240),
        createdBy: USER,
        payload: {
          qtyNum: t.currentQtyGal,
          condition: t.currentQtyGal === 0 ? 'empty' : 'partial',
          note: 'Returned from demo job',
        },
        synced: true,
      });
    }

    if (t.status === 'hold') {
      events.push({
        id: uuid(),
        toteId: t.id,
        type: 'damaged_flagged',
        createdAt: stamp(75),
        createdBy: USER,
        payload: { note: 'Valve guard damaged on arrival' },
        synced: true,
      });
    }

    if (t.status === 'discarded') {
      events.push({
        id: uuid(),
        toteId: t.id,
        type: 'discarded',
        createdAt: stamp(320),
        createdBy: USER,
        payload: { note: 'Historical retired tote' },
        synced: true,
      });
    }
  }

  return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function seedIfEmpty(): Promise<boolean> {
  const existing = await listProducts();
  if (existing.length > 0) return false;

  for (const p of products) await putProduct(p);
  for (const u of units) await putUnit(u);
  for (const j of jobs) await putJob(j);

  const totes = buildTotes();
  for (const t of totes) await putTote(t);

  const events = buildSeedEvents(totes);
  for (const e of events) await appendEvent(e);

  return true;
}

export async function resetDemoData(): Promise<void> {
  await clearAll();
  await seedIfEmpty();
  await scrubDemoIdentity();
}

export async function scrubDemoIdentity(): Promise<void> {
  const [totes, events] = await Promise.all([listTotes(), listEvents()]);

  for (const tote of totes) {
    const createdBy = normalizeOperator(tote.createdBy);
    const updatedBy = normalizeOperator(tote.updatedBy);
    if (createdBy !== tote.createdBy || updatedBy !== tote.updatedBy) {
      await putTote({
        ...tote,
        createdBy,
        updatedBy,
      });
    }
  }

  for (const event of events) {
    const createdBy = normalizeOperator(event.createdBy);
    if (createdBy !== event.createdBy) {
      await appendEvent({
        ...event,
        createdBy,
      });
    }
  }
}

function normalizeOperator(name: string): string {
  const legacyOperator = String.fromCharCode(106, 97, 99, 111, 98);
  return name.toLowerCase() === legacyOperator ? USER : name;
}
