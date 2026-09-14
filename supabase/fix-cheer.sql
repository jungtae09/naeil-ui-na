-- ============================================================
--  응원하기가 "권한이 없습니다" 로 막힐 때 실행하는 복구 SQL
--
--  Supabase 대시보드 → SQL Editor → New query 에 이 파일 전체를 붙여넣고 RUN.
--  여러 번 실행해도 안전합니다.
--
--  원인은 대부분 이것입니다:
--  응원 테이블의 보안 정책이 아직 '그룹' 시절 것으로 남아 있어서,
--  "같은 그룹인가?" 를 묻는데 이제 그룹이 없으니 항상 거절됩니다.
--  아래에서 그 정책을 '친구인가?' 로 바꿔줍니다.
-- ============================================================

-- 1) group_id 를 필수 항목에서 풀어준다 (컬럼이 남아 있는 경우에만)
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'encouragements'
       and column_name = 'group_id'
  ) then
    alter table public.encouragements alter column group_id drop not null;
    raise notice '[1/4] group_id 를 선택 항목으로 바꿨습니다.';
  else
    raise notice '[1/4] group_id 컬럼이 이미 없습니다. (정상)';
  end if;
end $$;

-- 2) "이 사람이 내 친구인가?" 를 판단하는 함수를 다시 만든다
create or replace function public.is_friend(p_other uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
     where f.status = 'accepted'
       and ((f.requester_id = auth.uid() and f.addressee_id = p_other)
         or (f.addressee_id = auth.uid() and f.requester_id = p_other))
  );
$$;

-- 3) 응원 테이블의 보안 정책을 친구 기준으로 다시 건다
alter table public.encouragements enable row level security;

grant select, insert on public.encouragements to authenticated;

drop policy if exists encouragements_select on public.encouragements;
create policy encouragements_select on public.encouragements for select
  using (receiver_id = auth.uid() or sender_id = auth.uid());

drop policy if exists encouragements_insert on public.encouragements;
create policy encouragements_insert on public.encouragements for insert
  with check (
    sender_id = auth.uid()
    and receiver_id <> auth.uid()
    and public.is_friend(receiver_id)
  );

do $$ begin raise notice '[2/4] is_friend 함수와 응원 정책을 다시 만들었습니다.'; end $$;

-- 4) 확인 — 아래 두 표를 보고 결과를 확인하세요
do $$ begin raise notice '[3/4] 아래 결과를 확인하세요.'; end $$;

-- 지금 걸려 있는 응원 정책 (insert 쪽 조건에 is_friend 가 보여야 정상)
select policyname as "정책 이름",
       cmd        as "동작",
       coalesce(with_check, qual) as "조건"
  from pg_policies
 where schemaname = 'public' and tablename = 'encouragements'
 order by cmd;
