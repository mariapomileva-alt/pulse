# Supabase setup (FastPulse MVP)

## 1) Create a Supabase project
- Go to https://supabase.com and create a new project.
- Copy the **Project URL** and **Anon public key** from Project Settings → API.

## 2) Create tables (SQL)
Open SQL Editor and run:

```sql
create table if not exists pulses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  cadence text not null,
  is_anonymous boolean not null default true,
  admin_key text not null,
  created_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  pulse_id uuid references pulses(id) on delete cascade,
  text text not null,
  type text not null,
  position int not null
);

create table if not exists question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  label text not null,
  value_number int
);

create table if not exists pulse_runs (
  id uuid primary key default gen_random_uuid(),
  pulse_id uuid references pulses(id) on delete cascade,
  started_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  pulse_id uuid references pulses(id) on delete cascade,
  pulse_run_id uuid references pulse_runs(id) on delete cascade,
  respondent_label text,
  created_at timestamptz not null default now()
);

create table if not exists response_values (
  id uuid primary key default gen_random_uuid(),
  response_id uuid references responses(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  option_id uuid references question_options(id) on delete cascade,
  value_number int,
  value_text text
);

create index if not exists questions_pulse_id_idx on questions(pulse_id);
create index if not exists question_options_question_id_idx on question_options(question_id);
create index if not exists pulse_runs_pulse_id_idx on pulse_runs(pulse_id);
create index if not exists responses_pulse_id_idx on responses(pulse_id);
create index if not exists responses_run_id_idx on responses(pulse_run_id);
create index if not exists response_values_question_id_idx on response_values(question_id);
```

## 3) Enable Row Level Security + policies
Turn on RLS for all tables and add policies:

```sql
alter table pulses enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table pulse_runs enable row level security;
alter table responses enable row level security;
alter table response_values enable row level security;

create policy "Pulses are readable by anyone"
  on pulses for select using (true);
create policy "Pulses are insertable by anyone"
  on pulses for insert with check (true);

create policy "Questions are readable by anyone"
  on questions for select using (true);
create policy "Questions are insertable by anyone"
  on questions for insert with check (true);

create policy "Options are readable by anyone"
  on question_options for select using (true);
create policy "Options are insertable by anyone"
  on question_options for insert with check (true);

create policy "Runs are readable by anyone"
  on pulse_runs for select using (true);
create policy "Runs are insertable by anyone"
  on pulse_runs for insert with check (true);

create policy "Responses are readable by anyone"
  on responses for select using (true);
create policy "Responses are insertable by anyone"
  on responses for insert with check (true);

create policy "Response values are readable by anyone"
  on response_values for select using (true);
create policy "Response values are insertable by anyone"
  on response_values for insert with check (true);
```

> These are open policies for MVP speed. For stricter controls later, we can lock writes.

## 4) Add keys to the project
Open `voting-app/config.js` and paste your keys:

```js
export const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

## 5) Deploy
You can deploy this folder to any static hosting (Netlify, Vercel, GitHub Pages).
