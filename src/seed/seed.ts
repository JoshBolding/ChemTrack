// Demo seed dataset. Loaded into IndexedDB on first run if the DB is empty.
// Mirrors the story from the planning phase:
//   - 14 just-received totes of Corrosion Inhibitor 47 (RH-250414-001..014)
//   - 2 totes already out on Unit 3 against Smith Energy #44
//   - a few messy cases to exercise the exception model

import type { Job, Product, Tote, ToteEvent, Unit } from '../types';
import {
  listProducts,
  putProduct,
  putUnit,
  putJob,
  putTote,
  appendEvent,
} from '../db/repo';
import { uuid } from '../lib/ids';

const NOW = '2026-04-14T09:00:00.000Z';
const USER = 'jacob';

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

// Construct an event chain whose final state matches the seeded tote's
// current status and quantity. Without this, demo history shows a "Received"
// stamp for totes that are clearly partial, empty, or damaged — which
// breaks the illusion the instant someone opens a tote detail page.
function buildSeedEvents(totes: Tote[]): ToteEvent[] {
  const out: ToteEvent[] = [];
  for (const t of totes) {
    out.push(...lifecycleFor(t));
  }
  return out;
}

interface LifecycleStep {
  type: ToteEvent['type'];
  offsetHours: number; // relative to the tote's receivedAt anchor
  payload?: Record<string, unknown>;
  label?: string;
}

function lifecycleFor(t: Tote): ToteEvent[] {
  const steps: LifecycleStep[] = [
    {
      type: 'received',
      offsetHours: 0,
      payload: { productId: t.productId, qty: 330 },
    },
  ];

  const inUnit = t.location.kind === 'unit' && !!t.location.unitId;
  const unitId = t.location.unitId;

  switch (t.status) {
    case 'in_yard':
      // Partial totes back in yard got there via a usage → return cycle.
      if (t.currentQtyGal > 0 && t.currentQtyGal < 330) {
        steps.push(
          {
            type: 'assigned_to_unit',
            offsetHours: 18,
            payload: { unitId: 'u3', jobId: 'j1' },
          },
          {
            type: 'usage_recorded',
            offsetHours: 40,
            payload: {
              newQtyGal: t.currentQtyGal,
              usedDeltaGal: 330 - t.currentQtyGal,
              jobId: 'j1',
              note: 'End-of-day reading',
            },
          },
          {
            type: 'returned_to_yard',
            offsetHours: 64,
            payload: { qtyNum: t.currentQtyGal, condition: 'partial' },
          },
        );
      }
      // Fully empty totes in yard got there via usage → empty → return.
      if (t.currentQtyGal === 0) {
        steps.push(
          {
            type: 'assigned_to_unit',
            offsetHours: 18,
            payload: { unitId: 'u3', jobId: 'j1' },
          },
          {
            type: 'usage_recorded',
            offsetHours: 56,
            payload: {
              newQtyGal: 0,
              usedDeltaGal: 330,
              jobId: 'j1',
            },
          },
          {
            type: 'returned_to_yard',
            offsetHours: 72,
            payload: { qtyNum: 0, condition: 'empty' },
          },
        );
      }
      break;

    case 'assigned_to_unit':
      if (inUnit) {
        steps.push({
          type: 'assigned_to_unit',
          offsetHours: 12,
          payload: { unitId, jobId: t.jobId ?? null },
        });
        // If partial, add a usage event recording how they got there.
        if (t.currentQtyGal > 0 && t.currentQtyGal < 330) {
          steps.push({
            type: 'usage_recorded',
            offsetHours: 36,
            payload: {
              newQtyGal: t.currentQtyGal,
              usedDeltaGal: 330 - t.currentQtyGal,
              jobId: t.jobId ?? null,
              note: 'Shift end reading',
            },
          });
        }
      }
      break;

    case 'empty':
      if (inUnit) {
        // Emptied out on a unit, still sitting there waiting for pickup.
        steps.push(
          {
            type: 'assigned_to_unit',
            offsetHours: 12,
            payload: { unitId, jobId: t.jobId ?? null },
          },
          {
            type: 'usage_recorded',
            offsetHours: 48,
            payload: {
              newQtyGal: 0,
              usedDeltaGal: 330,
              jobId: t.jobId ?? null,
            },
          },
          {
            type: 'marked_empty',
            offsetHours: 49,
            payload: { note: 'Drained completely' },
          },
        );
      } else {
        // Returned empty to the yard, then formally marked empty.
        steps.push(
          {
            type: 'assigned_to_unit',
            offsetHours: 12,
            payload: { unitId: 'u3', jobId: 'j1' },
          },
          {
            type: 'usage_recorded',
            offsetHours: 48,
            payload: { newQtyGal: 0, usedDeltaGal: 330, jobId: 'j1' },
          },
          {
            type: 'returned_to_yard',
            offsetHours: 56,
            payload: { qtyNum: 0, condition: 'empty' },
          },
          {
            type: 'marked_empty',
            offsetHours: 60,
            payload: {},
          },
        );
      }
      break;

    case 'hold':
      // Damage flagged on return (or at receiving).
      steps.push({
        type: 'damaged_flagged',
        offsetHours: 2,
        payload: { note: 'Visible cracking near cap — pulled from service' },
      });
      break;

    case 'discarded':
      steps.push(
        {
          type: 'assigned_to_unit',
          offsetHours: 12,
          payload: { unitId: 'u3', jobId: 'j1' },
        },
        {
          type: 'usage_recorded',
          offsetHours: 36,
          payload: { newQtyGal: 0, usedDeltaGal: 330, jobId: 'j1' },
        },
        {
          type: 'marked_empty',
          offsetHours: 40,
          payload: {},
        },
        {
          type: 'discarded',
          offsetHours: 48,
          payload: { note: 'End of life — scheduled for pickup' },
        },
      );
      break;
  }

  const anchor = new Date(t.receivedAt).getTime();
  return steps.map((s) => ({
    id: uuid(),
    toteId: t.id,
    type: s.type,
    createdAt: new Date(anchor + s.offsetHours * 3_600_000).toISOString(),
    createdBy: USER,
    payload: s.payload ?? {},
    synced: true,
  }));
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
