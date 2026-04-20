// Demo seed dataset. Loaded into IndexedDB on first run if the DB is empty.
// V2: products carry density + default capacity, totes carry per-tote capacity
// plus lot/vendor/expiration metadata.

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
const USER = 'admin';

const products: Product[] = [
  {
    id: 'ci47',
    name: 'Corrosion Inhibitor 47',
    category: 'corrosion_inhibitor',
    manufacturer: 'Multi-Chem',
    densityLbPerGal: 8.4,
    defaultToteCapacityGal: 330,
    reorderThresholdGal: 1000,
  },
  {
    id: 'si18',
    name: 'Scale Inhibitor 18',
    category: 'scale_inhibitor',
    manufacturer: 'Champion X',
    densityLbPerGal: 9.1,
    defaultToteCapacityGal: 330,
    reorderThresholdGal: 600,
  },
  {
    id: 'fx',
    name: 'Foamer X',
    category: 'foamer',
    manufacturer: 'Baker Hughes',
    densityLbPerGal: 8.7,
    defaultToteCapacityGal: 275,
    reorderThresholdGal: 400,
  },
  {
    id: 'b12',
    name: 'Biocide B-12',
    category: 'biocide',
    manufacturer: 'Nalco',
    densityLbPerGal: 9.4,
    defaultToteCapacityGal: 250,
    reorderThresholdGal: 300,
  },
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

interface ToteSeed {
  id: string;
  productId: string;
  status: Tote['status'];
  location: Tote['location'];
  qty: number;
  capacity?: number;
  jobId?: string;
  updatedLabel: string;
  receivedAt?: string;
  lotNumber?: string;
  vendorBol?: string;
  vendor?: string;
  tareWeightLb?: number;
  expiresAt?: string;
}

function makeTote(s: ToteSeed): Tote {
  const product = products.find((p) => p.id === s.productId);
  const capacity = s.capacity ?? product?.defaultToteCapacityGal ?? 330;
  return {
    id: s.id,
    productId: s.productId,
    status: s.status,
    location: s.location,
    jobId: s.jobId,
    capacityGal: capacity,
    currentQtyGal: s.qty,
    lotNumber: s.lotNumber,
    expiresAt: s.expiresAt,
    vendorBol: s.vendorBol,
    vendor: s.vendor,
    tareWeightLb: s.tareWeightLb,
    receivedAt: s.receivedAt ?? NOW,
    createdBy: USER,
    syncState: 'synced',
    updatedAt: s.receivedAt ?? NOW,
    updatedBy: USER,
    updatedLabel: s.updatedLabel,
  };
}

function buildTotes(): Tote[] {
  const out: Tote[] = [];

  // 14 just received — Multi-Chem CI-47 shipment, lot MC-26-0412
  for (let i = 1; i <= 14; i++) {
    out.push(
      makeTote({
        id: `RH-250414-${String(i).padStart(3, '0')}`,
        productId: 'ci47',
        status: 'in_yard',
        location: { kind: 'yard' },
        qty: 330,
        capacity: 330,
        updatedLabel: 'Received',
        lotNumber: 'MC-26-0412',
        vendor: 'Multi-Chem',
        vendorBol: 'BOL-44217',
        tareWeightLb: 145,
        expiresAt: '2027-04-12',
      }),
    );
  }

  // Older shipments
  out.push(
    makeTote({
      id: 'RH-250407-002', productId: 'si18', status: 'in_yard',
      location: { kind: 'yard' }, qty: 330, updatedLabel: 'Received',
      lotNumber: 'CX-26-0331', vendor: 'Champion X', vendorBol: 'BOL-44102',
      tareWeightLb: 150, expiresAt: '2027-03-31',
      receivedAt: '2026-04-07T10:00:00.000Z',
    }),
  );
  out.push(
    makeTote({
      id: 'RH-250407-005', productId: 'fx', status: 'in_yard',
      location: { kind: 'yard' }, qty: 275, capacity: 275, updatedLabel: 'Received',
      lotNumber: 'BH-26-0405', vendor: 'Baker Hughes', vendorBol: 'BOL-44115',
      tareWeightLb: 130, expiresAt: '2026-10-05',
      receivedAt: '2026-04-07T10:00:00.000Z',
    }),
  );

  // Unit 3 loaded out — 2 full + 3 partial, on Smith Energy #44
  out.push(
    makeTote({
      id: 'RH-250410-001', productId: 'ci47', status: 'assigned_to_unit',
      location: { kind: 'unit', unitId: 'u3' }, qty: 330, jobId: 'j1',
      updatedLabel: 'Assigned to unit', lotNumber: 'MC-26-0412', vendor: 'Multi-Chem',
      vendorBol: 'BOL-44217', tareWeightLb: 145, expiresAt: '2027-04-12',
      receivedAt: '2026-04-10T08:00:00.000Z',
    }),
  );
  out.push(
    makeTote({
      id: 'RH-250410-002', productId: 'ci47', status: 'assigned_to_unit',
      location: { kind: 'unit', unitId: 'u3' }, qty: 330, jobId: 'j1',
      updatedLabel: 'Assigned to unit', lotNumber: 'MC-26-0412', vendor: 'Multi-Chem',
      vendorBol: 'BOL-44217', tareWeightLb: 145, expiresAt: '2027-04-12',
      receivedAt: '2026-04-10T08:00:00.000Z',
    }),
  );
  out.push(
    makeTote({
      id: 'RH-250409-003', productId: 'ci47', status: 'assigned_to_unit',
      location: { kind: 'unit', unitId: 'u3' }, qty: 280, jobId: 'j1',
      updatedLabel: 'Usage recorded', lotNumber: 'MC-26-0405', vendor: 'Multi-Chem',
      tareWeightLb: 145, expiresAt: '2027-04-05',
      receivedAt: '2026-04-09T08:00:00.000Z',
    }),
  );
  out.push(
    makeTote({
      id: 'RH-250409-004', productId: 'ci47', status: 'assigned_to_unit',
      location: { kind: 'unit', unitId: 'u3' }, qty: 210, jobId: 'j1',
      updatedLabel: 'Usage recorded', lotNumber: 'MC-26-0405', vendor: 'Multi-Chem',
      tareWeightLb: 145, expiresAt: '2027-04-05',
      receivedAt: '2026-04-09T08:00:00.000Z',
    }),
  );
  out.push(
    makeTote({
      id: 'RH-250408-001', productId: 'si18', status: 'assigned_to_unit',
      location: { kind: 'unit', unitId: 'u3' }, qty: 120, jobId: 'j1',
      updatedLabel: 'Usage recorded', lotNumber: 'CX-26-0331', vendor: 'Champion X',
      tareWeightLb: 150, expiresAt: '2027-03-31',
      receivedAt: '2026-04-08T08:00:00.000Z',
    }),
  );

  // Unit 4
  out.push(
    makeTote({
      id: 'RH-250411-001', productId: 'fx', status: 'assigned_to_unit',
      location: { kind: 'unit', unitId: 'u4' }, qty: 275, capacity: 275, jobId: 'j7',
      updatedLabel: 'Assigned to unit', lotNumber: 'BH-26-0405', vendor: 'Baker Hughes',
      tareWeightLb: 130, expiresAt: '2026-10-05',
      receivedAt: '2026-04-11T08:00:00.000Z',
    }),
  );
  out.push(
    makeTote({
      id: 'RH-250411-002', productId: 'b12', status: 'assigned_to_unit',
      location: { kind: 'unit', unitId: 'u4' }, qty: 250, capacity: 250, jobId: 'j7',
      updatedLabel: 'Assigned to unit', lotNumber: 'NL-26-0327', vendor: 'Nalco',
      tareWeightLb: 120, expiresAt: '2026-09-27',
      receivedAt: '2026-04-11T08:00:00.000Z',
    }),
  );

  // Unit 5 — 1 partial
  out.push(
    makeTote({
      id: 'RH-250406-001', productId: 'ci47', status: 'assigned_to_unit',
      location: { kind: 'unit', unitId: 'u5' }, qty: 90, jobId: 'j4',
      updatedLabel: 'Usage recorded', lotNumber: 'MC-26-0328', vendor: 'Multi-Chem',
      tareWeightLb: 145, expiresAt: '2027-03-28',
      receivedAt: '2026-04-06T08:00:00.000Z',
    }),
  );

  // Returned partials
  out.push(
    makeTote({
      id: 'RH-250402-001', productId: 'ci47', status: 'in_yard',
      location: { kind: 'yard' }, qty: 40,
      updatedLabel: 'Returned to yard', lotNumber: 'MC-26-0320', vendor: 'Multi-Chem',
      tareWeightLb: 145, expiresAt: '2027-03-20',
      receivedAt: '2026-04-02T08:00:00.000Z',
    }),
  );
  out.push(
    makeTote({
      id: 'RH-250403-002', productId: 'si18', status: 'in_yard',
      location: { kind: 'yard' }, qty: 180,
      updatedLabel: 'Returned to yard', lotNumber: 'CX-26-0320', vendor: 'Champion X',
      tareWeightLb: 150, expiresAt: '2027-03-20',
      receivedAt: '2026-04-03T08:00:00.000Z',
    }),
  );

  // Empty totes
  out.push(
    makeTote({
      id: 'RH-250401-007', productId: 'ci47', status: 'empty',
      location: { kind: 'unit', unitId: 'u3' }, qty: 0, jobId: 'j1',
      updatedLabel: 'Marked empty',
      receivedAt: '2026-04-01T08:00:00.000Z',
    }),
  );
  out.push(
    makeTote({
      id: 'RH-250328-001', productId: 'ci47', status: 'empty',
      location: { kind: 'yard' }, qty: 0,
      updatedLabel: 'Returned to yard',
      receivedAt: '2026-03-28T08:00:00.000Z',
    }),
  );
  out.push(
    makeTote({
      id: 'RH-250329-002', productId: 'fx', status: 'empty',
      location: { kind: 'yard' }, qty: 0, capacity: 275,
      updatedLabel: 'Returned to yard',
      receivedAt: '2026-03-29T08:00:00.000Z',
    }),
  );

  // Discarded
  out.push(
    makeTote({
      id: 'RH-250301-001', productId: 'ci47', status: 'discarded',
      location: { kind: 'yard' }, qty: 0,
      updatedLabel: 'Discarded',
      receivedAt: '2026-03-01T08:00:00.000Z',
    }),
  );

  // Damaged-on-arrival hold
  out.push(
    makeTote({
      id: 'RH-250414-099', productId: 'b12', status: 'hold',
      location: { kind: 'hold' }, qty: 250, capacity: 250,
      updatedLabel: 'Flagged damaged', lotNumber: 'NL-26-0410', vendor: 'Nalco',
      vendorBol: 'BOL-44218', tareWeightLb: 120, expiresAt: '2026-10-10',
    }),
  );

  // Exception: qty over capacity
  out.push(
    makeTote({
      id: 'RH-250405-099', productId: 'si18', status: 'in_yard',
      location: { kind: 'yard' }, qty: 340,
      updatedLabel: 'Quantity corrected',
      receivedAt: '2026-04-05T08:00:00.000Z',
    }),
  );

  // Exception: inactive unit / job (kept for exceptions screen later)
  out.push(
    makeTote({
      id: 'RH-250330-003', productId: 'fx', status: 'assigned_to_unit',
      location: { kind: 'unit', unitId: 'u8' }, qty: 275, capacity: 275,
      updatedLabel: 'Assigned to unit',
      receivedAt: '2026-03-30T08:00:00.000Z',
    }),
  );
  out.push(
    makeTote({
      id: 'RH-250330-004', productId: 'ci47', status: 'assigned_to_unit',
      location: { kind: 'unit', unitId: 'u2' }, qty: 200, jobId: 'j8',
      updatedLabel: 'Usage recorded',
      receivedAt: '2026-03-30T08:00:00.000Z',
    }),
  );

  // Pending sync
  const pending = makeTote({
    id: 'RH-250412-003', productId: 'ci47', status: 'assigned_to_unit',
    location: { kind: 'unit', unitId: 'u3' }, qty: 255, jobId: 'j1',
    updatedLabel: 'Usage recorded', lotNumber: 'MC-26-0412', vendor: 'Multi-Chem',
    tareWeightLb: 145, expiresAt: '2027-04-12',
    receivedAt: '2026-04-12T08:00:00.000Z',
  });
  pending.syncState = 'pending';
  out.push(pending);

  return out;
}

function buildSeedEvents(totes: Tote[]): ToteEvent[] {
  const out: ToteEvent[] = [];
  for (const t of totes) {
    out.push(...lifecycleFor(t));
  }
  return out;
}

interface LifecycleStep {
  type: ToteEvent['type'];
  offsetHours: number;
  payload?: Record<string, unknown>;
  label?: string;
}

function lifecycleFor(t: Tote): ToteEvent[] {
  const cap = t.capacityGal;
  const steps: LifecycleStep[] = [
    {
      type: 'received',
      offsetHours: 0,
      payload: {
        productId: t.productId,
        qty: cap,
        lotNumber: t.lotNumber,
        vendor: t.vendor,
        vendorBol: t.vendorBol,
      },
    },
  ];

  const inUnit = t.location.kind === 'unit' && !!t.location.unitId;
  const unitId = t.location.unitId;

  switch (t.status) {
    case 'in_yard':
      if (t.currentQtyGal > 0 && t.currentQtyGal < cap) {
        steps.push(
          { type: 'assigned_to_unit', offsetHours: 18, payload: { unitId: 'u3', jobId: 'j1' } },
          {
            type: 'usage_recorded', offsetHours: 40,
            payload: { newQtyGal: t.currentQtyGal, usedDeltaGal: cap - t.currentQtyGal, jobId: 'j1', note: 'End-of-day reading' },
          },
          { type: 'returned_to_yard', offsetHours: 64, payload: { qtyNum: t.currentQtyGal, condition: 'partial' } },
        );
      }
      if (t.currentQtyGal === 0) {
        steps.push(
          { type: 'assigned_to_unit', offsetHours: 18, payload: { unitId: 'u3', jobId: 'j1' } },
          { type: 'usage_recorded', offsetHours: 56, payload: { newQtyGal: 0, usedDeltaGal: cap, jobId: 'j1' } },
          { type: 'returned_to_yard', offsetHours: 72, payload: { qtyNum: 0, condition: 'empty' } },
        );
      }
      break;

    case 'assigned_to_unit':
      if (inUnit) {
        steps.push({
          type: 'assigned_to_unit', offsetHours: 12,
          payload: { unitId, jobId: t.jobId ?? null },
        });
        if (t.currentQtyGal > 0 && t.currentQtyGal < cap) {
          steps.push({
            type: 'usage_recorded', offsetHours: 36,
            payload: { newQtyGal: t.currentQtyGal, usedDeltaGal: cap - t.currentQtyGal, jobId: t.jobId ?? null, note: 'Shift end reading' },
          });
        }
      }
      break;

    case 'empty':
      if (inUnit) {
        steps.push(
          { type: 'assigned_to_unit', offsetHours: 12, payload: { unitId, jobId: t.jobId ?? null } },
          { type: 'usage_recorded', offsetHours: 48, payload: { newQtyGal: 0, usedDeltaGal: cap, jobId: t.jobId ?? null } },
          { type: 'marked_empty', offsetHours: 49, payload: { note: 'Drained completely' } },
        );
      } else {
        steps.push(
          { type: 'assigned_to_unit', offsetHours: 12, payload: { unitId: 'u3', jobId: 'j1' } },
          { type: 'usage_recorded', offsetHours: 48, payload: { newQtyGal: 0, usedDeltaGal: cap, jobId: 'j1' } },
          { type: 'returned_to_yard', offsetHours: 56, payload: { qtyNum: 0, condition: 'empty' } },
          { type: 'marked_empty', offsetHours: 60, payload: {} },
        );
      }
      break;

    case 'hold':
      steps.push({
        type: 'damaged_flagged', offsetHours: 2,
        payload: { note: 'Visible cracking near cap — pulled from service' },
      });
      break;

    case 'discarded':
      steps.push(
        { type: 'assigned_to_unit', offsetHours: 12, payload: { unitId: 'u3', jobId: 'j1' } },
        { type: 'usage_recorded', offsetHours: 36, payload: { newQtyGal: 0, usedDeltaGal: cap, jobId: 'j1' } },
        { type: 'marked_empty', offsetHours: 40, payload: {} },
        { type: 'discarded', offsetHours: 48, payload: { note: 'End of life — scheduled for pickup' } },
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
