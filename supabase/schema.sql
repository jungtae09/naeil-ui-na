-- ============================================================
--  「내일의 나」 Supabase 스키마
--  Supabase 대시보드 → SQL Editor 에 전체를 붙여넣고 RUN 하세요.
--  (여러 번 실행해도 안전하도록 작성되어 있습니다.)
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. profiles : Auth 사용자와 1:1
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null default '',
  avatar      text not null default '🌱',
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 회원가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 2. groups / group_members : 최대 4명
-- ------------------------------------------------------------
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  -- 같은 그룹에 중복 가입 불가
  constraint group_members_group_user_key unique (group_id, user_id),
  -- 한 사용자는 하나의 그룹에만 소속
  constraint group_members_user_key unique (user_id)
);

create index if not exists group_members_group_idx on public.group_members(group_id);

-- 그룹 정원(4명) 강제
create or replace function public.enforce_group_capacity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (select count(*) from public.group_members where group_id = new.group_id) >= 4 then
    raise exception 'GROUP_FULL';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_group_capacity on public.group_members;
create trigger trg_group_capacity
  before insert on public.group_members
  for each row execute function public.enforce_group_capacity();

-- ------------------------------------------------------------
-- 3. rules : 나의 10가지 약속
-- ------------------------------------------------------------
create table if not exists public.rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  position    int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists rules_user_idx on public.rules(user_id, position);

-- ------------------------------------------------------------
-- 4. daily_records : 날짜별 규칙 완료 기록
--    rule_title 을 함께 저장해 과거 기록이 규칙 수정에 영향받지 않게 한다.
-- ------------------------------------------------------------
create table if not exists public.daily_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  rule_id      uuid not null references public.rules(id) on delete cascade,
  rule_title   text not null default '',
  date         date not null,
  completed    boolean not null default true,
  completed_at timestamptz not null default now(),
  constraint daily_records_unique unique (user_id, rule_id, date)
);

create index if not exists daily_records_user_date_idx on public.daily_records(user_id, date);

-- ------------------------------------------------------------
-- 5. daily_stats : 하루 요약(집계)
--    그룹원에게 공개되는 값은 여기서만 나가고,
--    규칙의 내용/회고 같은 개인 정보는 절대 포함하지 않는다.
-- ------------------------------------------------------------
create table if not exists public.daily_stats (
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  completed_count int not null default 0,
  total_rules     int not null default 10,
  is_complete     boolean not null default false,
  updated_at      timestamptz not null default now(),
  primary key (user_id, date)
);

create or replace function public.refresh_daily_stats()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_user  uuid;
  v_date  date;
  v_count int;
  v_total int;
begin
  v_user := coalesce(new.user_id, old.user_id);
  v_date := coalesce(new.date,    old.date);

  select count(*) into v_count
    from public.daily_records
   where user_id = v_user and date = v_date and completed;

  select count(*) into v_total
    from public.rules
   where user_id = v_user and is_active;

  if v_total is null or v_total = 0 then
    v_total := 10;
  end if;

  insert into public.daily_stats (user_id, date, completed_count, total_rules, is_complete, updated_at)
  values (v_user, v_date, v_count, v_total, v_count >= v_total, now())
  on conflict (user_id, date) do update
    set completed_count = excluded.completed_count,
        total_rules     = excluded.total_rules,
        is_complete     = excluded.is_complete,
        updated_at      = now();

  return null;
end;
$$;

drop trigger if exists trg_refresh_daily_stats on public.daily_records;
create trigger trg_refresh_daily_stats
  after insert or update or delete on public.daily_records
  for each row execute function public.refresh_daily_stats();

-- ------------------------------------------------------------
-- 6. weekly_reviews : 주간 회고 (본인만 조회 가능)
-- ------------------------------------------------------------
create table if not exists public.weekly_reviews (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  week_start       date not null,
  week_end         date not null,
  achievement_rate numeric(5,2),
  reflection       text,
  difficulty       text,
  next_goal        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint weekly_reviews_unique unique (user_id, week_start)
);

-- ------------------------------------------------------------
-- 7. encouragements : 응원 (하루 1인 1회)
-- ------------------------------------------------------------
create table if not exists public.encouragements (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users(id) on delete cascade,
  receiver_id  uuid not null references auth.users(id) on delete cascade,
  group_id     uuid not null references public.groups(id) on delete cascade,
  message_type text not null,
  date         date not null,
  created_at   timestamptz not null default now(),
  constraint encouragements_once_a_day unique (sender_id, receiver_id, date)
);

create index if not exists encouragements_receiver_idx
  on public.encouragements(receiver_id, date);

-- ============================================================
--  헬퍼 함수 (RLS 재귀를 피하기 위해 security definer 사용)
-- ============================================================

create or replace function public.my_group_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select group_id from public.group_members where user_id = auth.uid() limit 1;
$$;

create or replace function public.my_group_member_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select gm.user_id
    from public.group_members gm
   where gm.group_id = public.my_group_id();
$$;

-- ============================================================
--  Row Level Security
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.rules          enable row level security;
alter table public.daily_records  enable row level security;
alter table public.daily_stats    enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.encouragements enable row level security;

-- profiles ---------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or id in (select public.my_group_member_ids()));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- groups -----------------------------------------------------
-- 초대 코드로 남의 그룹을 조회하는 일은 RPC(join_group_by_code)로만 가능하다.
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select
  using (id = public.my_group_id());

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update
  using (created_by = auth.uid()) with check (created_by = auth.uid());

-- group_members ----------------------------------------------
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members for select
  using (group_id = public.my_group_id());

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members for delete
  using (user_id = auth.uid());

-- rules : 본인만 --------------------------------------------
drop policy if exists rules_all on public.rules;
create policy rules_all on public.rules for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- daily_records : 본인만 ------------------------------------
drop policy if exists daily_records_all on public.daily_records;
create policy daily_records_all on public.daily_records for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- daily_stats : 본인만 읽기(그룹 공개값은 RPC 로만 나간다) ---
drop policy if exists daily_stats_select on public.daily_stats;
create policy daily_stats_select on public.daily_stats for select
  using (user_id = auth.uid());

drop policy if exists daily_stats_write on public.daily_stats;
create policy daily_stats_write on public.daily_stats for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- weekly_reviews : 본인만 ------------------------------------
drop policy if exists weekly_reviews_all on public.weekly_reviews;
create policy weekly_reviews_all on public.weekly_reviews for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- encouragements ---------------------------------------------
drop policy if exists encouragements_select on public.encouragements;
create policy encouragements_select on public.encouragements for select
  using (receiver_id = auth.uid() or sender_id = auth.uid());

drop policy if exists encouragements_insert on public.encouragements;
create policy encouragements_insert on public.encouragements for insert
  with check (
    sender_id = auth.uid()
    and group_id = public.my_group_id()
    and receiver_id in (select public.my_group_member_ids())
    and receiver_id <> auth.uid()
  );

-- ============================================================
--  RPC
-- ============================================================

-- 초대 코드 생성 (헷갈리는 글자 0/O/1/I 제외)
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups g where g.invite_code = code);
  end loop;
  return code;
end;
$$;

-- 그룹 만들기
create or replace function public.create_group(p_name text)
returns table (group_id uuid, group_name text, code text)
language plpgsql security definer set search_path = public
as $$
declare
  v_id   uuid;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if exists (select 1 from public.group_members gm where gm.user_id = auth.uid()) then
    raise exception 'ALREADY_IN_GROUP';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'INVALID_NAME';
  end if;

  v_code := public.generate_invite_code();

  insert into public.groups (name, invite_code, created_by)
  values (btrim(p_name), v_code, auth.uid())
  returning groups.id into v_id;

  insert into public.group_members (group_id, user_id) values (v_id, auth.uid());

  return query select v_id, btrim(p_name), v_code;
  -- 반환 컬럼: group_id, group_name, code
end;
$$;

-- 초대 코드로 참여
create or replace function public.join_group_by_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_group uuid;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if exists (select 1 from public.group_members gm where gm.user_id = auth.uid()) then
    raise exception 'ALREADY_IN_GROUP';
  end if;

  select g.id into v_group
    from public.groups g
   where g.invite_code = upper(btrim(p_code));

  if v_group is null then
    raise exception 'INVALID_CODE';
  end if;

  select count(*) into v_count from public.group_members where group_id = v_group;
  if v_count >= 4 then
    raise exception 'GROUP_FULL';
  end if;

  insert into public.group_members (group_id, user_id) values (v_group, auth.uid());
  return v_group;
end;
$$;

-- 연속 기록 계산 (실제 기록 기반)
create or replace function public.calc_streaks(p_user uuid, p_today date)
returns table (current_streak int, best_streak int, complete_days int)
language plpgsql stable security definer set search_path = public
as $$
declare
  r    record;
  prev date := null;
  cur  int  := 0;
  best int  := 0;
  tot  int  := 0;
begin
  for r in
    select ds.date
      from public.daily_stats ds
     where ds.user_id = p_user and ds.is_complete and ds.date <= p_today
     order by ds.date asc
  loop
    tot := tot + 1;
    if prev is not null and r.date = prev + 1 then
      cur := cur + 1;
    else
      cur := 1;
    end if;
    if cur > best then best := cur; end if;
    prev := r.date;
  end loop;

  -- 마지막 완주일이 오늘 또는 어제가 아니면 현재 연속은 0
  if prev is null or prev < p_today - 1 then
    cur := 0;
  end if;

  current_streak := cur;
  best_streak    := best;
  complete_days  := tot;
  return next;
end;
$$;

-- 그룹원 공개 통계
-- 공개되는 것: 닉네임 / 아바타 / 오늘 완료 개수 / 오늘 완주 여부 /
--              연속 기록 / 이번 주 달성률 / 성장률 / 총 완료 횟수 / 응원 여부
-- 공개되지 않는 것: 규칙 내용, 회고, 날짜별 상세 기록
create or replace function public.group_member_stats(p_group_id uuid, p_today date)
returns table (
  user_id         uuid,
  nickname        text,
  avatar          text,
  today_count     int,
  today_total     int,
  today_complete  boolean,
  current_streak  int,
  best_streak     int,
  complete_days   int,
  total_completions int,
  week_rate       numeric,
  prev_week_rate  numeric,
  growth          numeric,
  cheered_today   boolean
)
language plpgsql stable security definer set search_path = public
as $$
declare
  m            record;
  v_week_start date;
  v_days       int;
  v_rules      int;
  v_sum        int;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not exists (
    select 1 from public.group_members gm
     where gm.group_id = p_group_id and gm.user_id = auth.uid()
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;

  -- 주 시작 = 월요일
  v_week_start := p_today - (extract(isodow from p_today)::int - 1);
  v_days       := (p_today - v_week_start) + 1;

  for m in
    select gm.user_id as uid, p.nickname as nick, p.avatar as av
      from public.group_members gm
      join public.profiles p on p.id = gm.user_id
     where gm.group_id = p_group_id
     order by gm.joined_at asc
  loop
    user_id  := m.uid;
    nickname := m.nick;
    avatar   := m.av;

    select count(*) into v_rules
      from public.rules where rules.user_id = m.uid and is_active;
    if v_rules is null or v_rules = 0 then v_rules := 10; end if;

    select coalesce(ds.completed_count, 0), coalesce(ds.total_rules, v_rules), coalesce(ds.is_complete, false)
      into today_count, today_total, today_complete
      from public.daily_stats ds
     where ds.user_id = m.uid and ds.date = p_today;

    if today_count is null then
      today_count    := 0;
      today_total    := v_rules;
      today_complete := false;
    end if;

    select cs.current_streak, cs.best_streak, cs.complete_days
      into current_streak, best_streak, complete_days
      from public.calc_streaks(m.uid, p_today) cs;

    select coalesce(sum(dr_count), 0) into total_completions
      from (
        select ds.completed_count as dr_count
          from public.daily_stats ds
         where ds.user_id = m.uid and ds.date <= p_today
      ) t;

    -- 이번 주 달성률 (오늘까지 경과한 날 기준)
    select coalesce(sum(ds.completed_count), 0) into v_sum
      from public.daily_stats ds
     where ds.user_id = m.uid and ds.date >= v_week_start and ds.date <= p_today;
    week_rate := round((v_sum::numeric / greatest(v_days * v_rules, 1)) * 100, 1);

    -- 지난 주 달성률 (7일 전체 기준)
    select coalesce(sum(ds.completed_count), 0) into v_sum
      from public.daily_stats ds
     where ds.user_id = m.uid
       and ds.date >= v_week_start - 7
       and ds.date <= v_week_start - 1;
    prev_week_rate := round((v_sum::numeric / greatest(7 * v_rules, 1)) * 100, 1);

    growth := round(week_rate - prev_week_rate, 1);

    cheered_today := exists (
      select 1 from public.encouragements e
       where e.sender_id = auth.uid()
         and e.receiver_id = m.uid
         and e.date = p_today
    );

    return next;
  end loop;
end;
$$;

-- 오늘 받은 응원 (보낸 사람 닉네임 포함)
create or replace function public.my_encouragements(p_today date)
returns table (sender_nickname text, sender_avatar text, message_type text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select p.nickname, p.avatar, e.message_type, e.created_at
    from public.encouragements e
    join public.profiles p on p.id = e.sender_id
   where e.receiver_id = auth.uid() and e.date = p_today
   order by e.created_at desc;
$$;

-- 권한
grant execute on function public.create_group(text)                 to authenticated;
grant execute on function public.join_group_by_code(text)           to authenticated;
grant execute on function public.calc_streaks(uuid, date)           to authenticated;
grant execute on function public.group_member_stats(uuid, date)     to authenticated;
grant execute on function public.my_encouragements(date)            to authenticated;

-- Realtime (선택) : 그룹 화면 실시간 갱신을 쓰려면 아래를 실행하세요.
-- alter publication supabase_realtime add table public.daily_stats;
-- alter publication supabase_realtime add table public.encouragements;
