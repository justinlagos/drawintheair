-- Defensive: guard against the migration running twice.
do $body$
begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='teacher_profiles') then
    create table public.teacher_profiles (
      id uuid primary key default gen_random_uuid(),
      auth_user_id uuid not null unique references auth.users(id) on delete cascade,
      full_name text,
      school_name text,
      role text default 'teacher',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index teacher_profiles_auth_user_id_idx on public.teacher_profiles(auth_user_id);
  end if;
end;
$body$;

alter table public.teacher_profiles enable row level security;

drop policy if exists "teachers self-select" on public.teacher_profiles;
create policy "teachers self-select" on public.teacher_profiles
  for select using (auth.uid() = auth_user_id);

drop policy if exists "teachers self-insert" on public.teacher_profiles;
create policy "teachers self-insert" on public.teacher_profiles
  for insert with check (auth.uid() = auth_user_id);

drop policy if exists "teachers self-update" on public.teacher_profiles;
create policy "teachers self-update" on public.teacher_profiles
  for update using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

-- Auto-create profile on auth signup IF the signup payload includes role=teacher.
create or replace function public.handle_new_teacher_user()
returns trigger language plpgsql security definer set search_path = public as $body$
begin
  if (new.raw_user_meta_data ->> 'role') = 'teacher' then
    insert into public.teacher_profiles (auth_user_id, full_name, school_name)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', null),
      coalesce(new.raw_user_meta_data ->> 'school_name', null)
    )
    on conflict (auth_user_id) do nothing;
  end if;
  return new;
end;
$body$;

drop trigger if exists on_auth_user_created_teacher on auth.users;
create trigger on_auth_user_created_teacher
  after insert on auth.users
  for each row execute function public.handle_new_teacher_user();
