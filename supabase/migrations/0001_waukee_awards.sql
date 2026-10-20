-- Waukee SSBU Developer Awards — Stage 2 schema (run when the Supabase project exists)
-- Includes explicit Data API grants: as of 2026-10-30 new public tables are NOT auto-granted.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft' check (status in ('draft','open','closed')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id text primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text not null,
  icon text not null default '',
  is_finale boolean not null default false,
  sort_order int not null
);

create table public.groups (
  id text primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  number int not null,
  name text not null,
  students text[] not null default '{}',
  description text not null default '',
  screenshot_path text,
  sort_order int not null
);

create table public.ballots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  device_token_hash text not null,
  submitted_at timestamptz not null default now(),
  unique (event_id, device_token_hash)
);

create table public.ballot_selections (
  ballot_id uuid not null references public.ballots(id) on delete cascade,
  category_id text not null references public.categories(id),
  group_id text not null references public.groups(id),
  primary key (ballot_id, category_id)
);

alter table public.events enable row level security;
alter table public.categories enable row level security;
alter table public.groups enable row level security;
alter table public.ballots enable row level security;
alter table public.ballot_selections enable row level security;

-- Students (anon) may READ event content only — never ballots, selections, or results.
grant select on public.events, public.categories, public.groups to anon;
grant select, insert, update, delete on public.events, public.categories, public.groups, public.ballots, public.ballot_selections to service_role;
grant select on public.events, public.categories, public.groups to authenticated;

create policy "public read events" on public.events for select to anon using (true);
create policy "public read categories" on public.categories for select to anon using (true);
create policy "public read groups" on public.groups for select to anon using (true);
-- No policies on ballots/ballot_selections: only service_role (server) can touch them.

-- Storage: create a PUBLIC-read bucket named 'screenshots' in the dashboard;
-- uploads happen only from the teacher dashboard via the service role.

-- Atomic ballot submission with full validation (same rules as the local store).
create or replace function public.submit_ballot(p_event_id uuid, p_device_token_hash text, p_selections jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_ballot_id uuid;
  v_specialty_count int;
begin
  select status into v_status from events where id = p_event_id for update;
  if v_status is distinct from 'open' then
    raise exception 'Voting is not open';
  end if;
  if exists (select 1 from ballots where event_id = p_event_id and device_token_hash = p_device_token_hash) then
    raise exception 'This device already submitted a ballot';
  end if;
  -- exactly one pick per category, all valid groups (enforced by FK + count check)
  if (select count(*) from jsonb_object_keys(p_selections)) <>
     (select count(*) from categories where event_id = p_event_id) then
    raise exception 'Every award needs exactly one pick';
  end if;
  -- specialty awards must be distinct groups; the finale is unrestricted
  select count(distinct value) into v_specialty_count
  from jsonb_each_text(p_selections) e
  join categories c on c.id = e.key
  where c.event_id = p_event_id and not c.is_finale;
  if v_specialty_count <> (select count(*) from categories where event_id = p_event_id and not is_finale) then
    raise exception 'Specialty awards each need a different group';
  end if;

  insert into ballots (event_id, device_token_hash) values (p_event_id, p_device_token_hash)
  returning id into v_ballot_id;
  insert into ballot_selections (ballot_id, category_id, group_id)
  select v_ballot_id, key, value from jsonb_each_text(p_selections);
end;
$$;

revoke execute on function public.submit_ballot(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_ballot(uuid, text, jsonb) to service_role;

-- ── Seed: this event ────────────────────────────────────────────────────────
insert into public.events (id, name, status) values
  ('11111111-1111-1111-1111-111111111111', 'Waukee SSBU Developer Awards', 'closed')
on conflict (id) do nothing;

insert into public.categories (id, event_id, title, description, icon, is_finale, sort_order) values
  ('most-visually-appealing', '11111111-1111-1111-1111-111111111111', 'Most Visually Appealing', 'The one that looks the best — colors, style, and how polished it feels.', '✨', false, 1),
  ('easiest-to-use',          '11111111-1111-1111-1111-111111111111', 'Easiest to Use', 'You could run a tournament with it right away — no one has to explain it to you.', '🕹️', false, 2),
  ('simplest-solution',       '11111111-1111-1111-1111-111111111111', 'Simplest Solution', 'It just solves the problem in a clean, simple way. Nothing extra — it works.', '🧩', false, 3),
  ('wow-award',               '11111111-1111-1111-1111-111111111111', 'The WOW Award', 'The one that shocked you with how cool it was.', '⚡', false, 4),
  ('best-overall',            '11111111-1111-1111-1111-111111111111', 'Best Overall', 'All 7 are back. If we could only pick one app to run our tournament, this is it.', '🏆', true, 5)
on conflict (id) do nothing;

insert into public.groups (id, event_id, number, name, students, description, sort_order) values
  ('group-1', '11111111-1111-1111-1111-111111111111', 1, 'Group 1', array['Loukya','Hiran','Reva'], '', 1),
  ('group-2', '11111111-1111-1111-1111-111111111111', 2, 'Group 2', array['Hari','Kendal','Gavin'], '', 2),
  ('group-3', '11111111-1111-1111-1111-111111111111', 3, 'Group 3', array['Oliver','Zain','Sadie'], '', 3),
  ('group-4', '11111111-1111-1111-1111-111111111111', 4, 'Group 4', array['Sunaina','James','Ryan'], '', 4),
  ('group-5', '11111111-1111-1111-1111-111111111111', 5, 'Group 5', array['Aura','Joy','Kate'], '', 5),
  ('group-6', '11111111-1111-1111-1111-111111111111', 6, 'Group 6', array['Israel','Aryan','Hansitha'], '', 6),
  ('group-7', '11111111-1111-1111-1111-111111111111', 7, 'Group 7', array['Emma','Curtis','Bisesh'], '', 7)
on conflict (id) do nothing;
