-- Hold Up: database schema, row-level security and storage.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to re-run: it drops and recreates the policies and functions.

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.profiles (
  id uuid primary key,                       -- = auth.uid() for real users; fixed ids for sample people
  display_name text not null default 'Guest' check (char_length(display_name) between 1 and 30),
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author uuid not null references public.profiles(id) on delete cascade,
  item text not null check (char_length(item) between 1 and 80),
  price numeric(12,2) not null check (price >= 0 and price < 10000000),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  reason text not null check (char_length(reason) between 1 and 400),
  alt text not null default '' check (char_length(alt) <= 300),
  link text not null default '' check (char_length(link) <= 500 and (link = '' or link ~* '^https?://')),
  photo_path text check (photo_path is null or char_length(photo_path) <= 200),
  circle_id uuid references public.circles(id) on delete cascade,   -- null = everyone
  status text not null default 'open' check (status in ('open','skipped','bought')),
  hidden boolean not null default false,                           -- set automatically after 3 reports
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);

create table if not exists public.votes (
  post_id uuid not null references public.posts(id) on delete cascade,
  voter uuid not null references public.profiles(id) on delete cascade,
  verdict text not null check (verdict in ('approve','deny')),
  comment text not null default '' check (char_length(comment) <= 300),
  created_at timestamptz not null default now(),
  primary key (post_id, voter)
);

create table if not exists public.likes (
  post_id uuid not null,
  voter uuid not null,                       -- whose comment is liked
  liker uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, voter, liker),
  foreign key (post_id, voter) references public.votes(post_id, voter) on delete cascade
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter uuid not null references public.profiles(id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  unique (post_id, reporter)
);

create table if not exists public.blocks (
  blocker uuid not null references public.profiles(id) on delete cascade,
  blocked uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

create table if not exists public.survey_responses (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  answers jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- helper functions ----------
create or replace function public.is_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from circle_members where circle_id = c and user_id = auth.uid());
$$;

create or replace function public.can_see_post(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from posts
    where id = p
      and (author = auth.uid() or (not hidden and (circle_id is null or is_member(circle_id))))
  );
$$;

create or replace function public.has_voted(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from votes where post_id = p and voter = auth.uid());
$$;

create or replace function public.is_author(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from posts where id = p and author = auth.uid());
$$;

-- vote counts are visible to everyone who can see the post; the votes themselves only after you vote
create or replace function public.vote_counts() returns table (post_id uuid, n bigint)
language sql stable security definer set search_path = public as $$
  select v.post_id, count(*) from votes v where can_see_post(v.post_id) group by v.post_id;
$$;

create or replace function public.create_circle(circle_name text) returns public.circles
language plpgsql security definer set search_path = public as $$
declare c circles; new_code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  loop
    new_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    exit when not exists (select 1 from circles where code = new_code);
  end loop;
  insert into circles (name, code, created_by) values (left(trim(circle_name), 40), new_code, auth.uid()) returning * into c;
  insert into circle_members (circle_id, user_id) values (c.id, auth.uid());
  return c;
end $$;

create or replace function public.join_circle(invite_code text) returns public.circles
language plpgsql security definer set search_path = public as $$
declare c circles;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into c from circles where code = upper(trim(invite_code));
  if c.id is null then raise exception 'no circle with that code'; end if;
  insert into circle_members (circle_id, user_id) values (c.id, auth.uid()) on conflict do nothing;
  return c;
end $$;

-- hide a post automatically once 3 different people report it
create or replace function public.hide_reported() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from reports where post_id = new.post_id) >= 3 then
    update posts set hidden = true where id = new.post_id;
  end if;
  return new;
end $$;
drop trigger if exists reports_hide on public.reports;
create trigger reports_hide after insert on public.reports for each row execute function public.hide_reported();

-- deleting your account removes your profile and everything that hangs off it
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- row-level security ----------
alter table public.profiles enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.posts enable row level security;
alter table public.votes enable row level security;
alter table public.likes enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.survey_responses enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile insert" on public.profiles for insert with check (id = auth.uid() and not is_sample);
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and not is_sample);

create policy "members see circle" on public.circles for select using (is_member(id));
create policy "creator renames" on public.circles for update using (created_by = auth.uid());

create policy "see members of my circles" on public.circle_members for select using (is_member(circle_id));
create policy "leave circle" on public.circle_members for delete using (user_id = auth.uid());

create policy "see visible posts" on public.posts for select using (
  author = auth.uid() or (not hidden and (circle_id is null or is_member(circle_id))));
create policy "post as yourself" on public.posts for insert with check (
  author = auth.uid() and (circle_id is null or is_member(circle_id)));
create policy "edit own post" on public.posts for update using (author = auth.uid()) with check (author = auth.uid());
create policy "delete own post" on public.posts for delete using (author = auth.uid());

create policy "see votes after voting" on public.votes for select using (
  can_see_post(post_id) and (voter = auth.uid() or is_author(post_id) or has_voted(post_id)));
create policy "vote as yourself" on public.votes for insert with check (
  voter = auth.uid() and can_see_post(post_id) and not is_author(post_id));
create policy "edit own vote" on public.votes for update using (voter = auth.uid()) with check (voter = auth.uid());
create policy "undo own vote" on public.votes for delete using (voter = auth.uid());

create policy "likes readable" on public.likes for select using (can_see_post(post_id));
create policy "like as yourself" on public.likes for insert with check (liker = auth.uid() and liker <> voter and can_see_post(post_id));
create policy "unlike" on public.likes for delete using (liker = auth.uid());

create policy "report as yourself" on public.reports for insert with check (reporter = auth.uid());

create policy "own blocks read" on public.blocks for select using (blocker = auth.uid());
create policy "block" on public.blocks for insert with check (blocker = auth.uid() and blocked <> auth.uid());
create policy "unblock" on public.blocks for delete using (blocker = auth.uid());

create policy "own survey read" on public.survey_responses for select using (user_id = auth.uid());
create policy "own survey insert" on public.survey_responses for insert with check (user_id = auth.uid());
create policy "own survey update" on public.survey_responses for update using (user_id = auth.uid()) with check (user_id = auth.uid());

grant execute on function public.vote_counts(), public.create_circle(text), public.join_circle(text), public.delete_my_account() to authenticated;
revoke execute on function public.delete_my_account() from anon;

-- ---------- photo storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos public read" on storage.objects;
drop policy if exists "upload own photos" on storage.objects;
drop policy if exists "delete own photos" on storage.objects;
create policy "photos public read" on storage.objects for select using (bucket_id = 'photos');
create policy "upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
