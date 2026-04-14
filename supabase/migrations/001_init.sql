-- ChemTrack V1 schema
--
-- Matches the client-side types in src/types.ts. The client writes to
-- IndexedDB first and a sync worker pushes events here. The canonical
-- state is the `totes` row, kept in sync with the latest event.
--
-- Running this: paste into the Supabase SQL editor, or use `supabase db push`
-- if you have the CLI wired to this project.

-- ------------------------------------------------------------------
-- Reference data
-- ------------------------------------------------------------------

create table if not exists public.products (
    id          text primary key,
    name        text not null,
    created_at  timestamptz not null default now()
);

create table if not exists public.units (
    id          text primary key,
    name        text not null,
    region      text,
    supervisor  text,
    active      boolean not null default true,
    created_at  timestamptz not null default now()
);

create index if not exists units_active_idx on public.units (active);

create table if not exists public.jobs (
    id          text primary key,
    name        text not null,
    customer    text not null,
    region      text,
    active      boolean not null default true,
    created_at  timestamptz not null default now()
);

create index if not exists jobs_active_idx on public.jobs (active);

-- ------------------------------------------------------------------
-- Totes (canonical state)
-- ------------------------------------------------------------------

create table if not exists public.totes (
    id                  text primary key,
    product_id          text not null references public.products(id),
    status              text not null check (
        status in ('in_yard', 'assigned_to_unit', 'empty', 'hold', 'discarded')
    ),
    location_kind       text not null check (location_kind in ('yard', 'unit', 'hold')),
    location_unit_id    text references public.units(id),
    job_id              text references public.jobs(id),
    current_qty_gal     numeric(6, 2) not null default 0 check (current_qty_gal >= 0),
    received_at         timestamptz not null,
    created_by          text not null,
    updated_at          timestamptz not null default now(),
    updated_by          text not null,
    updated_label       text
);

create index if not exists totes_status_idx on public.totes (status);
create index if not exists totes_product_idx on public.totes (product_id);
create index if not exists totes_location_unit_idx on public.totes (location_unit_id);

-- ------------------------------------------------------------------
-- Events (append-only log)
-- ------------------------------------------------------------------

create table if not exists public.tote_events (
    id              uuid primary key,           -- client-generated uuid
    tote_id         text not null references public.totes(id),
    type            text not null check (
        type in (
            'received',
            'assigned_to_unit',
            'transferred',
            'returned_to_yard',
            'usage_recorded',
            'job_context_changed',
            'marked_empty',
            'damaged_flagged',
            'discarded',
            'note_added',
            'qty_corrected',
            'status_corrected'
        )
    ),
    payload         jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null,
    created_by      text not null,
    received_at     timestamptz not null default now()  -- when the server saw it
);

create index if not exists tote_events_tote_idx on public.tote_events (tote_id);
create index if not exists tote_events_created_at_idx on public.tote_events (created_at desc);

-- ------------------------------------------------------------------
-- Row Level Security
--
-- V1: any authenticated user can read/write everything. When roles land,
-- replace these with region-scoped policies.
-- ------------------------------------------------------------------

alter table public.products enable row level security;
alter table public.units enable row level security;
alter table public.jobs enable row level security;
alter table public.totes enable row level security;
alter table public.tote_events enable row level security;

create policy "authenticated read products"
    on public.products for select
    to authenticated using (true);

create policy "authenticated read units"
    on public.units for select
    to authenticated using (true);

create policy "authenticated read jobs"
    on public.jobs for select
    to authenticated using (true);

create policy "authenticated read totes"
    on public.totes for select
    to authenticated using (true);

create policy "authenticated upsert totes"
    on public.totes for insert
    to authenticated with check (true);

create policy "authenticated update totes"
    on public.totes for update
    to authenticated using (true) with check (true);

create policy "authenticated read events"
    on public.tote_events for select
    to authenticated using (true);

create policy "authenticated append events"
    on public.tote_events for insert
    to authenticated with check (true);

-- Events are append-only: explicitly no update/delete policies.
