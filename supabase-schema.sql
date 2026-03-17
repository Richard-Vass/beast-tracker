-- ═══════════════════════════════════════════════════════════════
-- BEAST TRACKER — Supabase Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ─── 1. USER PROFILES ─────────────────────────────────────────
create table if not exists user_profiles (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  name            text not null default '',
  email           text not null default '',
  age             integer,
  height          numeric(5,1),
  current_weight  numeric(5,1),
  goal            text default 'maintain',
  experience      text default 'intermediate',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── 2. WORKOUTS ──────────────────────────────────────────────
create table if not exists workouts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            timestamptz not null default now(),
  type            text not null,
  duration        integer,
  readiness       jsonb default '{}',
  notes           text default '',
  created_at      timestamptz not null default now()
);

create index if not exists idx_workouts_user_date on workouts(user_id, date desc);

-- ─── 3. WORKOUT SETS ─────────────────────────────────────────
create table if not exists workout_sets (
  id              uuid primary key default uuid_generate_v4(),
  workout_id      uuid not null references workouts(id) on delete cascade,
  exercise_id     text not null,
  exercise_name   text not null default '',
  set_number      integer not null,
  weight          numeric(6,1),
  reps            integer,
  rir             text default '',
  tempo           text default '',
  done            boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_workout_sets_workout on workout_sets(workout_id);
create index if not exists idx_workout_sets_exercise on workout_sets(exercise_id);

-- ─── 4. CUSTOM WORKOUTS ──────────────────────────────────────
create table if not exists custom_workouts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  workout_key     text not null,
  name            text not null,
  subtitle        text default '',
  color           text default '',
  warmup          jsonb default '[]',
  exercises       jsonb not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists idx_custom_workouts_user_key on custom_workouts(user_id, workout_key);

-- ─── 5. USER SCHEDULES ───────────────────────────────────────
create table if not exists user_schedules (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  mode            text not null default 'ppl',
  schedule        jsonb not null default '[{"d":0,"t":"PUSH"},{"d":1,"t":"PULL"},{"d":2,"t":"Z2"},{"d":3,"t":"LEGS"},{"d":4,"t":"PUSH"},{"d":5,"t":"Z2"},{"d":6,"t":"REST"}]',
  updated_at      timestamptz not null default now()
);

-- ─── 6. HEALTH LOGS ──────────────────────────────────────────
create table if not exists health_logs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  weight          numeric(5,1),
  sleep_hours     numeric(4,1),
  sleep_score     integer,
  body_battery    integer,
  hrv             numeric(5,1),
  rhr             integer,
  steps           integer,
  active_energy   integer,
  basal_energy    integer,
  spo2            numeric(4,1),
  respiratory_rate numeric(4,1),
  vo2_max         numeric(4,1),
  walking_distance numeric(8,0),
  flights_climbed integer,
  stand_hours     integer,
  hr_max          integer,
  hr_avg          integer,
  stress          integer,
  energy          integer,
  source          text default 'manual',
  created_at      timestamptz not null default now()
);

create unique index if not exists idx_health_logs_user_date on health_logs(user_id, date);

-- ─── 7. FOOD DIARY ───────────────────────────────────────────
create table if not exists food_diary (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  meal            text not null,
  food_name       text not null,
  portion         numeric(6,1) not null default 100,
  unit            text default 'g',
  calories        numeric(6,1) default 0,
  protein         numeric(6,1) default 0,
  carbs           numeric(6,1) default 0,
  fat             numeric(6,1) default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_food_diary_user_date on food_diary(user_id, date);

-- ─── 8. WATER LOGS ───────────────────────────────────────────
create table if not exists water_logs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  amount_ml       integer not null default 0,
  updated_at      timestamptz not null default now()
);

create unique index if not exists idx_water_logs_user_date on water_logs(user_id, date);

-- ─── 9. CUSTOM SUPPLEMENTS ───────────────────────────────────
create table if not exists custom_supplements (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  group_key       text not null,
  supplement_id   text not null,
  name            text not null,
  sort_order      integer default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_custom_supplements_user on custom_supplements(user_id);

-- ─── 10. SUPPLEMENT LOGS ─────────────────────────────────────
create table if not exists supplement_logs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  supplement_id   text not null,
  taken           boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists idx_supplement_logs_user_date on supplement_logs(user_id, date);

-- ─── 11. BODY MEASUREMENTS ───────────────────────────────────
create table if not exists body_measurements (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  weight          numeric(5,1),
  body_fat        numeric(4,1),
  chest           numeric(5,1),
  waist           numeric(5,1),
  hips            numeric(5,1),
  biceps          numeric(5,1),
  thigh           numeric(5,1),
  calf            numeric(5,1),
  neck            numeric(5,1),
  shoulders       numeric(5,1),
  created_at      timestamptz not null default now()
);

create index if not exists idx_body_measurements_user_date on body_measurements(user_id, date desc);

-- ─── 12. AI CONVERSATIONS ────────────────────────────────────
create table if not exists ai_conversations (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null default 'AI Chat',
  messages        jsonb not null default '[]',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_ai_conversations_user on ai_conversations(user_id);

-- ─── 13. AI TRAININGS ────────────────────────────────────────
create table if not exists ai_trainings (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  plan_type       text,
  content         jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_ai_trainings_user_date on ai_trainings(user_id, date desc);

-- ─── 14. PROGRESS PHOTOS ─────────────────────────────────────
create table if not exists progress_photos (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  photo_url       text not null,
  weight          numeric(5,1),
  body_fat        numeric(4,1),
  notes           text default '',
  created_at      timestamptz not null default now()
);

create index if not exists idx_progress_photos_user_date on progress_photos(user_id, date desc);

-- ─── 15. NUTRITION SETTINGS ──────────────────────────────────
create table if not exists nutrition_settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  gender          text default 'male',
  activity_level  text default 'moderate',
  goal            text default 'maintain',
  custom_calories integer,
  custom_protein  integer,
  custom_carbs    integer,
  custom_fat      integer,
  updated_at      timestamptz not null default now()
);

-- ─── 16. CUSTOM FOODS ────────────────────────────────────────
create table if not exists custom_foods (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  category        text default 'meals',
  calories        numeric(6,1) default 0,
  protein         numeric(6,1) default 0,
  carbs           numeric(6,1) default 0,
  fat             numeric(6,1) default 0,
  serving         numeric(6,1) default 100,
  unit            text default 'g',
  created_at      timestamptz not null default now()
);

-- ─── 17. ACTIVE SESSIONS ─────────────────────────────────────
create table if not exists active_sessions (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  session_data    jsonb not null,
  updated_at      timestamptz not null default now()
);

-- ─── 18. LOGIN LOGS ──────────────────────────────────────────
create table if not exists login_logs (
  id              uuid primary key default uuid_generate_v4(),
  email           text not null,
  success         boolean not null,
  error_msg       text,
  ip              text,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_login_logs_email on login_logs(email, created_at desc);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_user_profiles_updated before update on user_profiles for each row execute function update_updated_at();
create trigger trg_custom_workouts_updated before update on custom_workouts for each row execute function update_updated_at();
create trigger trg_user_schedules_updated before update on user_schedules for each row execute function update_updated_at();
create trigger trg_ai_conversations_updated before update on ai_conversations for each row execute function update_updated_at();
create trigger trg_nutrition_settings_updated before update on nutrition_settings for each row execute function update_updated_at();
create trigger trg_active_sessions_updated before update on active_sessions for each row execute function update_updated_at();
create trigger trg_water_logs_updated before update on water_logs for each row execute function update_updated_at();

-- Auto-create profile + settings on signup
create or replace function create_user_defaults()
returns trigger as $$
begin
  insert into user_profiles (user_id, email) values (new.id, new.email);
  insert into user_schedules (user_id) values (new.id);
  insert into nutrition_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_create_user_defaults
  after insert on auth.users for each row execute function create_user_defaults();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all user tables
alter table user_profiles enable row level security;
alter table workouts enable row level security;
alter table workout_sets enable row level security;
alter table custom_workouts enable row level security;
alter table user_schedules enable row level security;
alter table health_logs enable row level security;
alter table food_diary enable row level security;
alter table water_logs enable row level security;
alter table custom_supplements enable row level security;
alter table supplement_logs enable row level security;
alter table body_measurements enable row level security;
alter table ai_conversations enable row level security;
alter table ai_trainings enable row level security;
alter table progress_photos enable row level security;
alter table nutrition_settings enable row level security;
alter table custom_foods enable row level security;
alter table active_sessions enable row level security;
alter table login_logs enable row level security;

-- User-owned tables: full CRUD for own data
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array[
    'user_profiles', 'workouts', 'custom_workouts', 'health_logs',
    'food_diary', 'water_logs', 'custom_supplements', 'supplement_logs',
    'body_measurements', 'ai_conversations', 'ai_trainings',
    'progress_photos', 'custom_foods'
  ]) loop
    execute format('create policy "own_select_%s" on %I for select using (auth.uid() = user_id)', tbl, tbl);
    execute format('create policy "own_insert_%s" on %I for insert with check (auth.uid() = user_id)', tbl, tbl);
    execute format('create policy "own_update_%s" on %I for update using (auth.uid() = user_id)', tbl, tbl);
    execute format('create policy "own_delete_%s" on %I for delete using (auth.uid() = user_id)', tbl, tbl);
  end loop;
end $$;

-- Singleton tables (user_id is PK)
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array['user_schedules', 'nutrition_settings', 'active_sessions']) loop
    execute format('create policy "own_select_%s" on %I for select using (auth.uid() = user_id)', tbl, tbl);
    execute format('create policy "own_insert_%s" on %I for insert with check (auth.uid() = user_id)', tbl, tbl);
    execute format('create policy "own_update_%s" on %I for update using (auth.uid() = user_id)', tbl, tbl);
    execute format('create policy "own_delete_%s" on %I for delete using (auth.uid() = user_id)', tbl, tbl);
  end loop;
end $$;

-- Workout sets: access via workout ownership
create policy "own_select_workout_sets" on workout_sets for select using (
  exists (select 1 from workouts w where w.id = workout_sets.workout_id and w.user_id = auth.uid())
);
create policy "own_insert_workout_sets" on workout_sets for insert with check (
  exists (select 1 from workouts w where w.id = workout_sets.workout_id and w.user_id = auth.uid())
);
create policy "own_update_workout_sets" on workout_sets for update using (
  exists (select 1 from workouts w where w.id = workout_sets.workout_id and w.user_id = auth.uid())
);
create policy "own_delete_workout_sets" on workout_sets for delete using (
  exists (select 1 from workouts w where w.id = workout_sets.workout_id and w.user_id = auth.uid())
);

-- Login logs: insert only (for API routes)
create policy "insert_login_logs" on login_logs for insert with check (true);

-- ═══════════════════════════════════════════════════════════════
-- STORAGE
-- ═══════════════════════════════════════════════════════════════

-- Create storage bucket for progress photos
insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false)
on conflict do nothing;

-- Storage RLS: users can only access their own folder
create policy "user_upload_photos" on storage.objects for insert
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "user_read_photos" on storage.objects for select
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "user_delete_photos" on storage.objects for delete
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
