-- Exercise library: seeded from free-exercise-db, extendable with custom exercises
create table if not exists exercise_library (
  id text primary key,
  name text not null,
  category text,
  level text,
  equipment text,
  primary_muscles text[],
  secondary_muscles text[],
  force text,
  mechanic text,
  instructions text[],
  is_custom boolean not null default false,
  created_at timestamptz default now()
);

-- Full-text search index on name for fast ILIKE queries
create index if not exists exercise_library_name_idx on exercise_library using gin (to_tsvector('english', name));

alter table exercise_library enable row level security;

drop policy if exists "owner_all" on exercise_library;
create policy "owner_all" on exercise_library
  for all to authenticated
  using (auth.jwt() ->> 'email' = 'marcokot@icloud.com')
  with check (auth.jwt() ->> 'email' = 'marcokot@icloud.com');
