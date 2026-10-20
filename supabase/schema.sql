-- 「혹시 모르니까 iii」 데이터베이스 설정
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 하면 됩니다. (여러 번 실행해도 안전합니다.)

create table if not exists public.records (
  id            uuid primary key default gen_random_uuid(),
  content       text not null,
  client_token  uuid not null unique,           -- 같은 제출이 두 번 저장되는 것을 막는 토큰
  is_hidden     boolean not null default false, -- true 로 바꾸면 화면에서 숨겨짐
  created_at    timestamptz not null default now(),
  constraint records_content_length
    check (char_length(btrim(content)) between 1 and 100)
);

create index if not exists records_visible_created_idx
  on public.records (created_at desc)
  where is_hidden = false;

alter table public.records enable row level security;

-- 공개 키(anon)에게는 필요한 최소 권한만 줍니다.
revoke all on public.records from anon, authenticated;
grant select (id, content, created_at) on public.records to anon;  -- 읽기: 3개 컬럼만
grant insert (content, client_token)   on public.records to anon;  -- 쓰기: 추가만 (수정/삭제 불가)

drop policy if exists "public can read visible records" on public.records;
create policy "public can read visible records"
  on public.records for select to anon
  using (is_hidden = false);

drop policy if exists "public can add records" on public.records;
create policy "public can add records"
  on public.records for insert to anon
  with check (is_hidden = false and char_length(btrim(content)) between 1 and 100);

-- 관리자 작업(부적절한 기록 숨김/삭제)은 Supabase 대시보드 Table Editor 에서 합니다.
--   숨김: records 테이블에서 해당 행의 is_hidden 을 true 로 변경
--   삭제: 해당 행 삭제
