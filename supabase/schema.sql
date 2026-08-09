-- NAJJUBTYPE shared-data schema
-- Run this entire file once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.posts (
  id text primary key,
  owner_user_id uuid default auth.uid(),
  title text not null check (char_length(title) between 1 and 120),
  author text not null check (char_length(author) between 1 and 80),
  source_url text check (
    source_url is null
    or (char_length(source_url) <= 300 and source_url ~* '^https?://')
  ),
  quote text not null check (char_length(quote) between 1 and 700),
  reason text not null default '' check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_metrics (
  post_id text primary key references public.posts(id) on delete cascade,
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  titles integer not null default 0 check (titles >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.likes (
  post_id text not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.sort_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  round_size integer not null check (round_size between 4 and 64),
  ranking text[] not null,
  winner_post_id text not null,
  played_at timestamptz not null default now(),
  is_legacy boolean not null default false,
  legacy_key text,
  constraint sort_runs_ranking_size check (cardinality(ranking) = round_size),
  constraint sort_runs_winner_matches check (ranking[1] = winner_post_id),
  constraint sort_runs_legacy_unique unique (user_id, legacy_key)
);

create table if not exists public.sort_matches (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.sort_runs(id) on delete cascade,
  match_order integer not null,
  winner_post_id text not null,
  loser_post_id text not null,
  created_at timestamptz not null default now(),
  constraint sort_matches_distinct_posts check (winner_post_id <> loser_post_id),
  constraint sort_matches_order_unique unique (run_id, match_order)
);

create index if not exists comments_post_created_idx on public.comments(post_id, created_at);
create index if not exists sort_runs_user_played_idx on public.sort_runs(user_id, played_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create or replace function public.create_post_metrics()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.post_metrics(post_id) values (new.id)
  on conflict (post_id) do nothing;
  return new;
end;
$$;

drop trigger if exists posts_create_metrics on public.posts;
create trigger posts_create_metrics
after insert on public.posts
for each row execute function public.create_post_metrics();

create or replace function public.touch_post_metrics()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.post_metrics set updated_at = now() where post_id = new.id;
  return new;
end;
$$;

drop trigger if exists posts_touch_metrics on public.posts;
create trigger posts_touch_metrics
after update on public.posts
for each row execute function public.touch_post_metrics();

create or replace function public.change_like_metric()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.post_metrics
      set like_count = like_count + 1, updated_at = now()
      where post_id = new.post_id;
    return new;
  end if;

  update public.post_metrics
    set like_count = greatest(like_count - 1, 0), updated_at = now()
    where post_id = old.post_id;
  return old;
end;
$$;

drop trigger if exists likes_change_metric on public.likes;
create trigger likes_change_metric
after insert or delete on public.likes
for each row execute function public.change_like_metric();

create or replace function public.change_comment_metric()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.post_metrics
      set comment_count = comment_count + 1, updated_at = now()
      where post_id = new.post_id;
    return new;
  end if;

  update public.post_metrics
    set comment_count = greatest(comment_count - 1, 0), updated_at = now()
    where post_id = old.post_id;
  return old;
end;
$$;

drop trigger if exists comments_change_metric on public.comments;
create trigger comments_change_metric
after insert or delete on public.comments
for each row execute function public.change_comment_metric();

create or replace function public.add_sort_title_metric()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.post_metrics
    set titles = titles + 1, updated_at = now()
    where post_id = new.winner_post_id;
  return new;
end;
$$;

drop trigger if exists sort_runs_add_title_metric on public.sort_runs;
create trigger sort_runs_add_title_metric
after insert on public.sort_runs
for each row execute function public.add_sort_title_metric();

create or replace function public.add_sort_match_metrics()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.post_metrics
    set wins = wins + 1, updated_at = now()
    where post_id = new.winner_post_id;

  update public.post_metrics
    set losses = losses + 1, updated_at = now()
    where post_id = new.loser_post_id;
  return new;
end;
$$;

drop trigger if exists sort_matches_add_metrics on public.sort_matches;
create trigger sort_matches_add_metrics
after insert on public.sort_matches
for each row execute function public.add_sort_match_metrics();

-- The browser reads these views instead of exposing anonymous user UUIDs.
create or replace view public.post_feed
with (security_invoker = false, security_barrier = true)
as
select
  p.id,
  p.title,
  p.author,
  p.source_url,
  p.quote,
  p.reason,
  p.created_at,
  p.updated_at,
  (p.owner_user_id = auth.uid()) as is_owner,
  m.like_count,
  m.comment_count,
  m.wins,
  m.losses,
  m.titles
from public.posts p
join public.post_metrics m on m.post_id = p.id;

create or replace view public.public_comments
with (security_invoker = false, security_barrier = true)
as
select id, post_id, body, created_at
from public.comments;

create or replace function public.submit_sort_result(
  p_run_id uuid,
  p_round_size integer,
  p_ranking text[],
  p_matches jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_run uuid;
  v_match_count integer;
  v_elimination_order text[];
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if p_run_id is null then
    raise exception 'Run ID is required';
  end if;

  if p_round_size < 4 or p_round_size > 64 or cardinality(p_ranking) <> p_round_size then
    raise exception 'Invalid round size or ranking';
  end if;

  if (select count(distinct x) from unnest(p_ranking) as x) <> p_round_size then
    raise exception 'Ranking contains duplicate posts';
  end if;

  if (select count(*) from public.posts where id = any(p_ranking)) <> p_round_size then
    raise exception 'Ranking contains an unknown post';
  end if;

  if jsonb_typeof(p_matches) <> 'array' then
    raise exception 'Matches must be an array';
  end if;

  v_match_count := jsonb_array_length(p_matches);
  if v_match_count <> p_round_size - 1 then
    raise exception 'A completed sort must contain round_size - 1 matches';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_matches) as e(item)
    where e.item->>'winner_id' is null
       or e.item->>'loser_id' is null
       or e.item->>'winner_id' = e.item->>'loser_id'
       or not ((e.item->>'winner_id') = any(p_ranking))
       or not ((e.item->>'loser_id') = any(p_ranking))
  ) then
    raise exception 'Matches contain invalid posts';
  end if;

  select array_agg(item->>'loser_id' order by ordinality desc)
    into v_elimination_order
  from jsonb_array_elements(p_matches) with ordinality as e(item, ordinality);

  if v_elimination_order <> p_ranking[2:p_round_size] then
    raise exception 'Ranking does not match match elimination order';
  end if;

  if exists (
    with match_rows as (
      select
        ordinality::integer as match_order,
        item->>'winner_id' as winner_id,
        item->>'loser_id' as loser_id
      from jsonb_array_elements(p_matches) with ordinality as e(item, ordinality)
    )
    select 1
    from match_rows won
    join match_rows lost
      on lost.loser_id = won.winner_id
     and lost.match_order < won.match_order
  ) then
    raise exception 'A post cannot win after being eliminated';
  end if;

  if (p_matches -> (v_match_count - 1) ->> 'winner_id') <> p_ranking[1] then
    raise exception 'Final winner does not match ranking';
  end if;

  insert into public.sort_runs(id, user_id, round_size, ranking, winner_post_id)
  values (p_run_id, v_user, p_round_size, p_ranking, p_ranking[1])
  on conflict (id) do nothing
  returning id into v_run;

  if v_run is null then
    if exists (select 1 from public.sort_runs where id = p_run_id and user_id = v_user) then
      return p_run_id;
    end if;
    raise exception 'Run ID already belongs to another user';
  end if;

  insert into public.sort_matches(run_id, match_order, winner_post_id, loser_post_id)
  select
    v_run,
    ordinality::integer,
    item->>'winner_id',
    item->>'loser_id'
  from jsonb_array_elements(p_matches) with ordinality as e(item, ordinality);

  return v_run;
end;
$$;

create or replace function public.import_legacy_sort_result(
  p_legacy_key text,
  p_played_at timestamptz,
  p_round_size integer,
  p_ranking text[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_run uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if p_legacy_key is null or char_length(p_legacy_key) > 200 then
    raise exception 'Invalid legacy key';
  end if;

  if p_round_size < 4 or p_round_size > 64 or cardinality(p_ranking) <> p_round_size then
    raise exception 'Invalid legacy ranking';
  end if;

  if (select count(distinct x) from unnest(p_ranking) as x) <> p_round_size
     or (select count(*) from public.posts where id = any(p_ranking)) <> p_round_size then
    raise exception 'Legacy ranking contains invalid posts';
  end if;

  insert into public.sort_runs(
    user_id, round_size, ranking, winner_post_id, played_at, is_legacy, legacy_key
  ) values (
    v_user,
    p_round_size,
    p_ranking,
    p_ranking[1],
    least(coalesce(p_played_at, now()), now()),
    true,
    p_legacy_key
  )
  on conflict (user_id, legacy_key) do nothing
  returning id into v_run;

  return v_run;
end;
$$;

alter table public.posts enable row level security;
alter table public.post_metrics enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.sort_runs enable row level security;
alter table public.sort_matches enable row level security;

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts
for insert to authenticated
with check ((select auth.uid()) = owner_user_id);

drop policy if exists posts_read_own on public.posts;
create policy posts_read_own on public.posts
for select to authenticated
using ((select auth.uid()) = owner_user_id);

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts
for update to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts
for delete to authenticated
using ((select auth.uid()) = owner_user_id);

drop policy if exists metrics_read_all on public.post_metrics;
create policy metrics_read_all on public.post_metrics
for select to authenticated using (true);

drop policy if exists likes_read_own on public.likes;
create policy likes_read_own on public.likes
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists likes_insert_own on public.likes;
create policy likes_insert_own on public.likes
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists likes_delete_own on public.likes;
create policy likes_delete_own on public.likes
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists sort_runs_read_own on public.sort_runs;
create policy sort_runs_read_own on public.sort_runs
for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.posts from anon, authenticated;
revoke all on public.likes from anon, authenticated;
revoke all on public.comments from anon, authenticated;
revoke all on public.post_metrics from anon, authenticated;
revoke all on public.sort_runs from anon, authenticated;
revoke all on public.sort_matches from anon, authenticated;
revoke all on public.post_feed from anon, authenticated;
revoke all on public.public_comments from anon, authenticated;

grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, delete on public.likes to authenticated;
grant insert on public.comments to authenticated;
grant select on public.post_metrics to authenticated;
grant select on public.sort_runs to authenticated;
grant select on public.post_feed to authenticated;
grant select on public.public_comments to authenticated;

revoke all on function public.submit_sort_result(uuid, integer, text[], jsonb) from public;
revoke all on function public.import_legacy_sort_result(text, timestamptz, integer, text[]) from public;
grant execute on function public.submit_sort_result(uuid, integer, text[], jsonb) to authenticated;
grant execute on function public.import_legacy_sort_result(text, timestamptz, integer, text[]) to authenticated;

-- Seed the four current NAJJUBTYPE posts. Re-running this script is safe.
insert into public.posts(id, owner_user_id, title, author, source_url, quote, reason, created_at)
values
  (
    'demo-1', null, '라인을 준수하세요', '옥잠', null,
    $$시험 끝났어 유나야.

사실 널 시험하기보다는 날 시험한 거였어.

이제 알 것 같아. 너를 믿고 싶어. 네 마음을 믿고 싶어.

좋아해. 선 넘어도 돼. 그래도 돼.$$, '', '2026-08-08 18:30:00+00'
  ),
  (
    'demo-2', null, '라인을 준수하세요', '옥잠', null,
    $$너 이제 진짜 큰일 난 거야.

나 같은 애들은 한 번 손에 쥐면 절대 안 놔주거든.

노유나가 비죽 웃었다. 멱살이 틀어 잡힌 채 듣는 경고가 뭐가 그리 좋다고 웃었다. 살벌하지만 달콤한 경고가 사랑스러웠다. 참을 수 없이 애타는 속에 고개를 비스듬히 틀며 다가갔다. 단숨에 좁혀진 거리에 놀라 숨을 참는 얼굴 위로 속삭였다. 큰일? 김주은 네가 잘 몰라서 그러는데....

- 그거야말로 내가 바라는 바야.$$, '', '2026-08-08 18:20:00+00'
  ),
  (
    'demo-3', null, '야 나 좀 아포', '옥잠', null,
    $$- 상식적으로, 도의적으로, 인간적으로.
- ....
- ....한 번 더 하자.
- 나도 그 말 하려고 했어...$$, '', '2026-08-08 18:10:00+00'
  ),
  (
    'demo-4', null, '꼬우면 한판 떠', '옥잠', null,
    $$- 야아 너 다 알면서 왜 그러냐 진짜...
- 빨리 말해. 머리 굴리지 말고.
- 아... 진짜 주은아 쫌....
- 예~ 할 말 있으세요?
- ...귀 대봐바.

진짜니너무귀여우니까그만해... 니 너무 예뻐서 나 죽겠다고 진짜... 존나 사랑해 개사랑해 여기 빨리 파토내고 너 들쳐업고 집으로 튀고 싶어... 이상입니다.$$, '박평식: 나가라 +', '2026-08-08 18:00:00+00'
  )
on conflict (id) do update set
  title = excluded.title,
  author = excluded.author,
  source_url = excluded.source_url,
  quote = excluded.quote,
  reason = excluded.reason;

insert into public.post_metrics(post_id)
select id from public.posts
on conflict (post_id) do nothing;

update public.post_metrics set like_count = 8 where post_id = 'demo-1' and like_count < 8;
update public.post_metrics set like_count = 10 where post_id = 'demo-4' and like_count < 10;

-- Realtime only exposes aggregate counters, never anonymous user IDs.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'post_metrics'
  ) then
    alter publication supabase_realtime add table public.post_metrics;
  end if;
end;
$$;
