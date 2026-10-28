-- منصّةٌ صغيرة تحاكي Supabase: الأدوار، وauth.uid() من إعدادٍ في الجلسة، وpg_cron وvault وnet بدُمًى.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('test.uid', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
-- «تولد الدوالّ مغلقة» كما في الحيّة (security_01)
alter default privileges in schema public revoke execute on functions from public;
create schema if not exists cron;
create table if not exists cron.job (jobid serial primary key, jobname text unique, schedule text, command text);
create or replace function cron.schedule(p_name text, p_sched text, p_cmd text) returns bigint language sql as
$$ insert into cron.job(jobname, schedule, command) values (p_name, p_sched, p_cmd)
   on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
create or replace function cron.unschedule(p_name text) returns boolean language sql as
$$ delete from cron.job where jobname = p_name returning true $$;
create schema if not exists vault;
create or replace view vault.decrypted_secrets as select 'x'::text as name, 'x'::text as decrypted_secret where false;
create schema if not exists net;
create or replace function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int) returns bigint language sql as $$ select 1::bigint $$;
