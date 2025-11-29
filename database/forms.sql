-- Forms feature schema and RLS policies for Supabase
-- Run in Supabase SQL Editor

-- Extensions
create extension if not exists "pgcrypto";

-- Tables
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  description text,
  slug text unique not null,
  is_public boolean not null default true,
  is_published boolean not null default false,
  accepting_responses boolean not null default true,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_forms_owner on public.forms(owner_id);
create index if not exists idx_forms_slug on public.forms(slug);

create table if not exists public.form_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  order_index int not null default 0,
  type text not null check (type in ('short_text','long_text','multiple_choice','checkboxes')),
  label text not null,
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb
);

create index if not exists idx_form_questions_form on public.form_questions(form_id);
create index if not exists idx_form_questions_order on public.form_questions(form_id, order_index);

create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  answers jsonb not null,
  meta jsonb
);

create index if not exists idx_form_responses_form on public.form_responses(form_id);
create index if not exists idx_form_responses_created on public.form_responses(form_id, created_at desc);

-- RLS
alter table public.forms enable row level security;
alter table public.form_questions enable row level security;
alter table public.form_responses enable row level security;

-- forms: owner full access
drop policy if exists "owner can select own forms" on public.forms;
create policy "owner can select own forms" on public.forms
for select to authenticated using (owner_id = auth.uid());

drop policy if exists "owner can insert forms" on public.forms;
create policy "owner can insert forms" on public.forms
for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "owner can update forms" on public.forms;
create policy "owner can update forms" on public.forms
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owner can delete forms" on public.forms;
create policy "owner can delete forms" on public.forms
for delete to authenticated using (owner_id = auth.uid());

-- forms: public can view only published public forms
drop policy if exists "public can view published public forms" on public.forms;
create policy "public can view published public forms" on public.forms
for select to public using (is_public = true and is_published = true);

-- form_questions: owner full access
drop policy if exists "owner can manage questions" on public.form_questions;
create policy "owner can manage questions" on public.form_questions
for all to authenticated using (
  exists (select 1 from public.forms f where f.id = form_questions.form_id and f.owner_id = auth.uid())
) with check (
  exists (select 1 from public.forms f where f.id = form_questions.form_id and f.owner_id = auth.uid())
);

-- form_questions: public can read of public published forms
drop policy if exists "public can read questions of published public forms" on public.form_questions;
create policy "public can read questions of published public forms" on public.form_questions
for select to public using (
  exists (
    select 1 from public.forms f
    where f.id = form_questions.form_id
      and f.is_public = true
      and f.is_published = true
  )
);

-- form_responses: public insert allowed when form is accepting and public & published
drop policy if exists "public can insert responses for open public forms" on public.form_responses;
create policy "public can insert responses for open public forms" on public.form_responses
for insert to anon with check (
  exists (
    select 1 from public.forms f
    where f.id = form_responses.form_id
      and f.accepting_responses = true
      and f.is_public = true
      and f.is_published = true
  )
);

-- form_responses: authenticated users can also insert responses
drop policy if exists "authenticated can insert responses for open public forms" on public.form_responses;
create policy "authenticated can insert responses for open public forms" on public.form_responses
for insert to authenticated with check (
  exists (
    select 1 from public.forms f
    where f.id = form_responses.form_id
      and f.accepting_responses = true
      and f.is_public = true
      and f.is_published = true
  )
);

-- form_responses: owner or admin can read
drop policy if exists "owner can read responses" on public.form_responses;
create policy "owner can read responses" on public.form_responses
for select to authenticated using (
  exists (
    select 1 from public.forms f
    where f.id = form_responses.form_id
      and f.owner_id = auth.uid()
  )
);

-- Allow admins (table: public.admins(user_id uuid, is_admin boolean)) to read responses
drop policy if exists "admin can read responses" on public.form_responses;
create policy "admin can read responses" on public.form_responses
for select to authenticated using (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid() and a.is_admin = true
  )
);

-- form_responses: owner can delete (optional)
drop policy if exists "owner can delete responses" on public.form_responses;
create policy "owner can delete responses" on public.form_responses
for delete to authenticated using (
  exists (
    select 1 from public.forms f
    where f.id = form_responses.form_id and f.owner_id = auth.uid()
  )
);

-- Optional: prevent selecting forms by others except published ones (already handled).
-- Done.
