-- Events table
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Uploads table
create table uploads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  guest_name text not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

-- Enable Realtime on uploads
alter publication supabase_realtime add table uploads;

-- RLS on events
alter table events enable row level security;
create policy "Public read events"
  on events for select using (true);

-- RLS on uploads (guests can read and insert; service role deletes)
alter table uploads enable row level security;
create policy "Public read uploads"
  on uploads for select using (true);
create policy "Public insert uploads"
  on uploads for insert with check (true);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true);

-- Storage RLS
create policy "Public read photos"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "Anyone can upload photos"
  on storage.objects for insert
  with check (bucket_id = 'photos');
