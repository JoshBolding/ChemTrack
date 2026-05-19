# ChemTrack

Mobile-first PWA for tracking 330-gallon chemical totes used by coiled tubing
field operations. V1 POC built for scan-first tote control.

The app is centered on scanning QR codes to act on individual totes. Totes
move between the yard and a small fleet of units (mobile mini-warehouses),
get assigned to jobs, have their usage recorded, and eventually come back
empty or get discarded.

## Design principles

- **Scan first, decide second** — the QR scanner is the primary entry point.
- **Big tap targets** — minimum 56px for gloved hands in the field.
- **Offline-first** — everything lives in IndexedDB; a sync queue drains
  pending writes when connectivity returns.
- **Status-aware actions** — the Tote Detail screen only surfaces the
  actions that make sense for a tote's current state.
- **Confirmation on every save** — a field crew needs to trust the app.

## Data model (locked for V1)

Three orthogonal fields per tote:

| Field    | Values |
|----------|--------|
| Status   | `in_yard` · `assigned_to_unit` · `empty` · `hold` · `discarded` |
| Location | `yard` · `unit:<id>` · `hold` |
| Job      | optional `job_id` (captured on `usage_recorded` events) |

All state changes are written as append-only events (see `src/types.ts`).
A "Partial" badge is derived (`qty > 0 && qty < 330`), not stored.

## Stack

- Vite + React + TypeScript
- Tailwind CSS (mobile-first, custom tokens for big tap targets)
- React Router (HashRouter for static hosting)
- IndexedDB via `idb`
- `html5-qrcode` for camera-based QR scanning
- `vite-plugin-pwa` for service worker + manifest

## Running locally

```bash
npm install --legacy-peer-deps
npm run dev
```

Open http://localhost:5173 on your phone (same Wi-Fi) or desktop. On first
load the app seeds IndexedDB with demo data — 30+ totes, 8 units, 8 jobs,
4 products, and a few intentionally messy cases to exercise exceptions.

QR scanning requires `https://` or `localhost` — your phone will need the
dev server accessed over HTTPS or via the deployed GitHub Pages URL.

## Build

```bash
npm run build
npm run preview
```

## Deployment

The app is Vercel-safe at the site root. Vite now defaults `base` to `/`, so a
normal Vercel build can use:

```bash
npm run build
```

If deploying the same build to GitHub Pages under `/ChemTrack/`, set:

```bash
VITE_BASE_PATH=/ChemTrack/
```

Pushes to `main` can still trigger `.github/workflows/deploy.yml` for GitHub
Pages when that environment variable is supplied. The GitHub Pages URL is:

    https://joshbolding.github.io/ChemTrack/

(You need to enable Pages once in **Settings → Pages → Source: GitHub
Actions** the first time.)

## Screens implemented in V1

1. Home
2. Scan Tote (camera + manual fallback)
3. Tote Detail (info, status-aware actions, full event history)
4. Assign to Unit
5. Record Usage (remaining/used toggle, job attribution)
6. Return to Yard (with condition)
7. Mark Empty
8. Discard Tote
9. Change Job Context
10. Receive Shipment (batch generation of new tote IDs)
11. Inventory (product totals + location rollup)
12. Units (list)
13. Unit Detail (mini-warehouse view)
14. Jobs (list)
15. Tote Search (fallback lookup)
16. Tote Not Found (clear error state)
17. Needs Attention (local exceptions)
18. Supervisor Report (inventory snapshot, unit loadout, job usage)
19. Add Note

## What's deferred

- Transfer between units (workaround: return + reassign)
- Unit / Job admin CRUD screens
- Real server sync (the queue exists; there's just nothing on the other end)
- Role-based permissions
- Label printing
