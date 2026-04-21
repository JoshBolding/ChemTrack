# ChemTrack

Chemical tote tracking PWA for Red Hawk oilfield coiled tubing operations. Tracks chemical inventory (corrosion inhibitors, scale inhibitors, biocides, foamers) across yard storage, field units, and jobs.

## Quick start

```bash
npm install --legacy-peer-deps   # vite-plugin-pwa peer dep conflict with vite 8
npm run dev                       # http://localhost:5173
npm test                          # vitest (55 tests)
npm run build                     # production build (~680 KB)
```

`--legacy-peer-deps` is required because vite-plugin-pwa pins vite <=7 but we run vite 8.

## Tech stack

- **React 19** + TypeScript 6 + Vite 8
- **React Router 7** with HashRouter (PWA-friendly, no server config)
- **Tailwind CSS 3** with custom design tokens (see below)
- **IndexedDB** via `idb` for offline-first storage
- **Supabase** scaffolded (`db/supabase.ts`, `db/auth.ts`, `lib/syncWorker.ts`) but not yet wired to a live instance
- **Vitest 4** with `fake-indexeddb` for DB tests under Node
- **html5-qrcode** for camera scanning
- **lucide-react** for icons
- **vite-plugin-pwa** for service worker / installable PWA

## Project structure

```
src/
  App.tsx              # HashRouter with all routes
  main.tsx             # Seed, auth init, sync worker boot
  index.css            # Tailwind + component classes (btn, card, input, label)
  types.ts             # All data types, status enums, constants
  components/
    Layout.tsx         # Shared shell: header with back nav, main content area
    StatusBadge.tsx    # Tote status/sync/partial badges
    OfflineBadge.tsx   # Online/offline indicator
  screens/             # One file per route (18 screens)
    Home.tsx           # Ops dashboard: attention queue, stats, nav grid
    ScanTote.tsx       # QR camera + manual entry
    ToteDetail.tsx     # Single tote: info, fill bar, receiving panel, actions, history
    Inventory.tsx      # Per-product rollup: gal+lb, threshold bars, lot grouping
    ReceiveShipment.tsx # Multi-field receive: product, vendor, BOL, lot, per-tote fill
    RecordUsage.tsx    # Remaining/used toggle, job attribution
    [+ 12 more action/list screens]
  db/
    schema.ts          # IndexedDB schema (v2), 5 object stores
    repo.ts            # CRUD functions for products, units, jobs, totes, events
    auth.ts            # Auth wrapper: Supabase or local fallback
    supabase.ts        # Supabase client init (env-var gated)
  lib/
    events.ts          # writeEvent(): appends event + updates tote atomically
    status.ts          # actionsForStatus(), isPartial(), isFull()
    ids.ts             # makeToteId(), uuid()
    syncWorker.ts      # Periodic push of pending events to Supabase
  seed/
    seed.ts            # Demo dataset: 4 products, 8 units, 8 jobs, ~30 totes
  test/
    setup.ts           # fake-indexeddb/auto for vitest
```

## Data model (types.ts)

Three core entities: **Product** (chemical), **Tote** (physical container), **Job** (customer context).

- **Product**: `id, name, densityLbPerGal, defaultToteCapacityGal, category?, manufacturer?, reorderThresholdGal?, costPerGal?, sdsUrl?`
- **Tote**: `id, productId, status, location, capacityGal, currentQtyGal, lotNumber?, expiresAt?, vendor?, vendorBol?, tareWeightLb?, conditionOnArrival?, jobId?, receivedAt, createdBy, syncState, updatedAt, updatedBy, updatedLabel?`
- **ToteEvent**: append-only log. Every user action creates an event via `writeEvent()` in `lib/events.ts`, which also updates the denormalized tote record.
- Tote statuses: `in_yard → assigned_to_unit → empty → discarded` (plus `hold` for damaged)
- Locations: `yard | unit (with unitId) | hold`
- Per-tote capacity (totes come in 250/275/330 gal sizes) — no global constant

## Auth

`db/auth.ts` exports `currentActorId()` which all screens use for `createdBy`/`updatedBy`. Without Supabase configured, falls back to `'admin'`. When Supabase env vars are set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), real auth kicks in.

## Design tokens — do not deviate

These are intentional and locked. The UI is flat and industrial, not decorative.

- **Primary color**: Red Hawk red `#b8202e`
- **Border radius**: 8px (`rounded-lg`) on cards/buttons/inputs, 6px (`rounded-md`) on small elements
- **Tap targets**: 44px minimum height on all interactive elements
- **Type**: 14px base (`text-sm`), 11px labels (`text-[11px]`), system-ui stack
- **Cards**: white bg, 1px slate-200 border, no shadows, no blur, no gradients
- **Spacing**: `p-3` on cards, `space-y-3` between sections, `gap-2` in grids
- **Color usage**: only use color to encode state (status badges, fill bar). No decorative color on text or backgrounds.
- **No**: shadows, animations, glassmorphism, gradients, decorative borders, emoji

## Navigation pattern

`Layout.tsx` accepts `back` (path) and `backState` (forwarded to Link state). ToteDetail reads `location.state.from` to know where to go back (defaults to `/scan`). Entry points (Inventory, Units, Search) pass `state={{ from: '/inventory' }}` etc. Action screens read and forward state through save/cancel so the origin survives the full flow.

## Testing

```bash
npm test              # vitest run (55 tests)
npm run test:watch    # vitest watch mode
```

Tests use `fake-indexeddb` (setup in `src/test/setup.ts`). The `clearAll()` helper from `db/repo.ts` resets all stores between tests. Test files live next to their source: `lib/events.test.ts`, `lib/status.test.ts`, `db/repo.test.ts`, `lib/syncWorker.test.ts`.

DB schema is v2. If you add required fields to Product or Tote, either bump the version with a migration in `db/schema.ts` or ensure seed data includes the new fields.

## Seed data

`seed/seed.ts` runs on first load if the products store is empty. Provides 4 chemicals with realistic densities, 8 units across TX/OK/ND/LA, 8 jobs, ~30 totes in various states (full, partial, empty, hold, discarded, pending sync). Totes carry lot numbers, vendor info, and expiration dates.

## What's not built yet

- Real Supabase auth / login screen (scaffolded but not wired)
- Admin CRUD for products, units, jobs (currently seed-only)
- Exceptions screen (types defined, no UI)
- Photo attachments on notes
- CSV/reporting export
- Code splitting (single 680KB bundle)

## Owner

Josh Bolding (joshbolding). Target customer: Red Hawk coiled tubing.
