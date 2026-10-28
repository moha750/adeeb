-- الجداول كما في الحيّة (الأعمدة من information_schema في ٢٠٢٦-١٠-٢٠)، بما يحتاجه التقييم وحده.
create table public.profiles (id uuid primary key, full_name text not null, email text not null default '', phone text not null default '',
  account_status text not null default 'active', joined_date date, gender text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());
create table public.councils (id text primary key, name_ar text not null, head_role_name text not null default 'x');
create table public.departments (id serial primary key, name_ar text not null, is_active boolean default true, council_id text not null default 'executive');
create table public.committees (id serial primary key, committee_name_ar text not null, is_active boolean not null default true,
  department_id integer references departments(id), council_id text not null, leader_role_name text not null, member_role_name text not null,
  supervises boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.roles (id serial primary key, role_name text not null unique, role_name_ar text not null, role_level integer not null default 0,
  membership_kind text not null default 'x', vote_weight numeric not null default 1, votes_in_all_elections boolean not null default false,
  holder_uniqueness text not null default 'multi', home_committee_id integer, prerequisite_role_name text,
  requires_membership boolean not null default true, removal_needs_club_president boolean not null default false);
create table public.user_roles (id serial primary key, user_id uuid not null references profiles(id) on delete cascade,
  committee_id integer references committees(id) on delete set null, is_active boolean not null default true,
  assigned_at timestamptz not null default now(), assigned_by uuid references profiles(id) on delete set null, notes text,
  department_id integer references departments(id), role_name text not null, ended_at timestamptz,
  is_acting boolean not null default false, acting_until date, acting_parent_id integer references user_roles(id) on delete set null,
  frozen_by integer references user_roles(id) on delete set null, acting_end text,
  constraint user_roles_acting_shape check ((((not is_acting) and (acting_until is null) and (acting_parent_id is null) and (acting_end is null)) or (is_acting and (frozen_by is null) and ((not is_active) or ((acting_until is null) <> (acting_parent_id is null)))))),
  constraint user_roles_frozen_shape check (((frozen_by is null) or ((not is_acting) and (not is_active)))));
create unique index user_roles_user_role_name_committee_key on public.user_roles (user_id, role_name, committee_id) where (not is_acting);
create table public.committee_supervision (id serial primary key, committee_id integer not null references committees(id) on delete cascade,
  unit_id integer not null references committees(id) on delete cascade, supervisor_id uuid not null references profiles(id) on delete cascade,
  assigned_by uuid, assigned_at timestamptz not null default now(), notes text);
create unique index committee_supervision_seat on public.committee_supervision (committee_id, unit_id);
create table public.permissions (id serial primary key, permission_key text not null unique, permission_name_ar text not null, description text,
  category text not null, created_at timestamptz default now());
create table public.role_permissions (permission_id integer not null references permissions(id), role_name text not null, created_at timestamptz default now(),
  primary key (role_name, permission_id));
create table public.position_authority (role_name text primary key, target_roles text[] not null default '{}', own_unit_roles text[] not null default '{}',
  blocked_roles text[] not null default '{}', note text);
create table public.activity_log (id serial primary key, user_id uuid references profiles(id) on delete set null, action_type text not null,
  target_type text not null, target_id text not null, details jsonb, ip_address text, created_at timestamptz not null default now());
create table public.notification_events (id bigserial primary key, kind text not null, facts jsonb not null, actor_id uuid,
  created_at timestamptz not null default now(), claimed_at timestamptz, attempts smallint not null default 0, dispatched_at timestamptz,
  recipients integer, error text, fallback text,
  constraint notification_events_facts_object check (jsonb_typeof(facts) = 'object'),
  constraint notification_events_kind_shape check (kind ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'));
create table public.elections (id uuid primary key default gen_random_uuid(), target_role_name text not null, target_committee_id integer,
  target_department_id integer, status text not null default 'candidacy_open', archived_at timestamptz, created_by uuid, candidacy_end timestamptz,
  created_at timestamptz not null default now());
create table public.election_candidates (id uuid primary key default gen_random_uuid(), election_id uuid references elections(id), user_id uuid,
  status text not null default 'pending', withdrawn_at timestamptz, review_note_ar text);
create table public.user_specific_permissions (user_id uuid, permission_id integer, is_granted boolean, expires_at timestamptz);
create table public.volunteers (user_id uuid, status text);
