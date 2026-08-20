-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260815091745   الاسم: volunteering_foundation

-- نظام التطوّع — الأساس (م١ من VOLUNTEERING-SYSTEM.md)
-- المتطوّع صفةٌ تُقرأ من صفٍّ قائم، لا حالةٌ تُكتب في profiles ولا دورٌ في user_roles.

-- ١) من هو متطوّع
create table if not exists public.volunteers (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  status      text not null default 'active' check (status in ('active','former')),
  applied_at  timestamptz not null default now(),
  ended_at    timestamptz,
  ended_by    uuid references public.profiles(id),
  end_reason  text,
  constraint volunteers_ended_complete check (
    status = 'active' or (ended_at is not null and btrim(coalesce(end_reason,'')) <> '')
  )
);
comment on table public.volunteers is
  'المتطوّعون: من قدّم للعضويّة ورتّب رغباته. الصفةُ تُقرأ من هذا الصفّ لا من عمودٍ في profiles.';

-- ٢) ثلاثُ رغباتٍ مرتّبة — جدولٌ لأنّ الموارد البشريّة تُرشّح به وتفرز
create table if not exists public.volunteer_preferences (
  user_id      uuid not null references public.volunteers(user_id) on delete cascade,
  rank         smallint not null check (rank between 1 and 3),
  committee_id integer not null references public.committees(id),
  updated_at   timestamptz not null default now(),
  primary key (user_id, rank),
  unique (user_id, committee_id)
);

-- ٣) الفرصة التطوّعيّة — جدولٌ مستقلٌّ عن activities عمدًا (المعنى يفترق لا الهيئة)
create table if not exists public.volunteer_opportunities (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text not null,
  committee_id  integer references public.committees(id),
  seats         integer not null check (seats > 0),
  target_gender text check (target_gender in ('male','female')),
  starts_on     date not null,
  ends_on       date,
  duration_note text,
  location      text,
  status        text not null default 'draft' check (status in ('draft','open','closed')),
  opened_at     timestamptz,
  closed_at     timestamptz,
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint opportunity_dates check (ends_on is null or ends_on >= starts_on)
);

-- ٤) التقديم والحضور والتقييم في صفٍّ واحد
create table if not exists public.volunteer_applications (
  id               uuid primary key default gen_random_uuid(),
  opportunity_id   uuid not null references public.volunteer_opportunities(id) on delete cascade,
  user_id          uuid not null references public.volunteers(user_id) on delete cascade,
  status           text not null default 'pending'
                   check (status in ('pending','accepted','rejected','withdrawn')),
  applied_at       timestamptz not null default now(),
  decided_by       uuid references public.profiles(id),
  decided_at       timestamptz,
  decision_reason  text,
  attendance       text check (attendance in ('attended','absent')),
  attendance_at    timestamptz,
  attendance_by    uuid references public.profiles(id),
  deserves_certificate boolean,
  denial_reason    text,
  admin_note       text,
  evaluated_by     uuid references public.profiles(id),
  evaluated_at     timestamptz,
  unique (opportunity_id, user_id),
  -- الرفضُ الصامت ممنوع
  constraint application_reject_reason check (
    status <> 'rejected' or btrim(coalesce(decision_reason,'')) <> ''
  ),
  -- الحضورُ والتقييم لا يُكتبان إلّا لمقبول
  constraint application_attendance_only_accepted check (
    attendance is null or status = 'accepted'
  ),
  constraint application_evaluation_only_accepted check (
    deserves_certificate is null or status = 'accepted'
  ),
  -- الحرمانُ مُسبَّب، ولا شهادةَ لغائب
  constraint application_denial_reason check (
    deserves_certificate is not false or btrim(coalesce(denial_reason,'')) <> ''
  ),
  constraint application_absent_no_certificate check (
    attendance is distinct from 'absent' or deserves_certificate is not true
  )
);
comment on column public.volunteer_applications.admin_note is
  'ملاحظةٌ إداريّة — لا تخرج إلى /me أبدًا. تُنتقى الأعمدةُ صراحةً في كلّ قارئٍ يخدم المتطوّع.';

-- ٥) شهادة المشاركة — لقطةٌ تُخزَّن ولا تُشتقّ (كشهادة الخبرة)
create sequence if not exists public.participation_certificate_serial_seq;

create table if not exists public.participation_certificates (
  id                 uuid primary key default gen_random_uuid(),
  application_id     uuid not null unique references public.volunteer_applications(id) on delete cascade,
  user_id            uuid not null references public.profiles(id),
  serial             text not null unique,
  holder_name        text not null,
  opportunity_title  text not null,
  committee_name     text,
  served_from        date not null,
  served_to          date,
  issued_by          uuid references public.profiles(id),
  issued_at          timestamptz not null default now(),
  status             text not null default 'active' check (status in ('active','revoked')),
  revoked_by         uuid references public.profiles(id),
  revoked_at         timestamptz,
  revoke_reason      text
);

create index if not exists idx_volunteer_prefs_committee on public.volunteer_preferences(committee_id, rank);
create index if not exists idx_volunteer_apps_opportunity on public.volunteer_applications(opportunity_id, status);
create index if not exists idx_volunteer_apps_user on public.volunteer_applications(user_id);
create index if not exists idx_opportunities_status on public.volunteer_opportunities(status, starts_on desc);
create index if not exists idx_participation_certs_user on public.participation_certificates(user_id);

-- ٦) القدرة الجديدة، وحاملوها الثلاثة
insert into public.permissions (permission_key, permission_name_ar, description, category)
select 'manage_volunteering', 'إدارة التطوّع',
       'فتحُ الفرص التطوّعيّة وقبولُ المتطوّعين وتأشيرُ حضورهم وتقييمُهم وإصدارُ شهادات المشاركة',
       'volunteering'
where not exists (select 1 from public.permissions where permission_key = 'manage_volunteering');

insert into public.role_permissions (role_name, permission_id)
select r.role_name, p.id
from (values ('club_president'), ('executive_council_president'), ('hr_committee_leader')) as r(role_name)
cross join public.permissions p
where p.permission_key = 'manage_volunteering'
  and not exists (
    select 1 from public.role_permissions rp
    where rp.role_name = r.role_name and rp.permission_id = p.id
  );

-- ٧) «أهو متطوّعٌ نشط؟» — المصدر الواحد للسؤال
create or replace function public.is_active_volunteer(p_user uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.volunteers v
    where v.user_id = p_user and v.status = 'active'
  );
$$;

-- ٨) اللجانُ التي تُرتَّب رغبةً — المصدر الواحد: نشطةٌ · تنفيذيّةٌ · لها تعريفٌ مكتوب.
-- والتعريفُ شرطُ العرض لأنّ الترتيب بلا تعريفٍ عبث.
create or replace function public.volunteer_committee_options()
returns table (id integer, name text, description text)
language sql stable security definer
set search_path to 'public'
as $$
  select c.id, c.committee_name_ar, c.description
  from public.committees c
  where c.is_active
    and c.council_id = 'executive'
    and btrim(coalesce(c.description, '')) <> ''
  order by c.department_id nulls last, c.id;
$$;

-- ٩) التقديمُ للعضويّة: يصير متطوّعًا في اللحظة، بلا مراجعة
create or replace function public.apply_for_volunteering(p_prefs integer[])
returns void
language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user uuid := auth.uid();
  v_need integer;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from profiles where id = v_user) then raise exception 'NO_PROFILE'; end if;
  -- العضوُ فوق هذه المحطّة لا دونها
  if is_adeeb_member(v_user) then raise exception 'ALREADY_MEMBER'; end if;
  if exists (select 1 from volunteers where user_id = v_user and status = 'active') then
    raise exception 'ALREADY_VOLUNTEER';
  end if;

  insert into volunteers (user_id, status, applied_at)
  values (v_user, 'active', now())
  on conflict (user_id) do update
    set status = 'active', ended_at = null, ended_by = null, end_reason = null;

  select least(3, count(*)) into v_need from volunteer_committee_options();
  if p_prefs is null or array_length(p_prefs, 1) is distinct from v_need then
    raise exception 'PREFS_COUNT';
  end if;
  if (select count(distinct x) from unnest(p_prefs) x) <> v_need then raise exception 'PREFS_DUPLICATE'; end if;
  if exists (
    select 1 from unnest(p_prefs) x
    where x not in (select o.id from volunteer_committee_options() o)
  ) then raise exception 'PREFS_INVALID'; end if;

  delete from volunteer_preferences where user_id = v_user;
  insert into volunteer_preferences (user_id, rank, committee_id)
  select v_user, ord::smallint, x from unnest(p_prefs) with ordinality as t(x, ord);

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_user, 'volunteer_apply', 'profile', v_user::text,
          jsonb_build_object('preferences', p_prefs));
end;
$$;

-- ١٠) إعادةُ ترتيب الرغبات ما دام متطوّعًا
create or replace function public.set_my_volunteer_preferences(p_prefs integer[])
returns void
language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user uuid := auth.uid();
  v_need integer;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not is_active_volunteer(v_user) then raise exception 'NOT_VOLUNTEER'; end if;

  select least(3, count(*)) into v_need from volunteer_committee_options();
  if p_prefs is null or array_length(p_prefs, 1) is distinct from v_need then
    raise exception 'PREFS_COUNT';
  end if;
  if (select count(distinct x) from unnest(p_prefs) x) <> v_need then raise exception 'PREFS_DUPLICATE'; end if;
  if exists (
    select 1 from unnest(p_prefs) x
    where x not in (select o.id from volunteer_committee_options() o)
  ) then raise exception 'PREFS_INVALID'; end if;

  delete from volunteer_preferences where user_id = v_user;
  insert into volunteer_preferences (user_id, rank, committee_id)
  select v_user, ord::smallint, x from unnest(p_prefs) with ordinality as t(x, ord);
end;
$$;

-- ١١) التقديمُ على فرصة — لا يقتطع مقعدًا (المقعدُ يُقتطع عند القبول)
create or replace function public.apply_for_opportunity(p_opportunity_id uuid)
returns uuid
language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user uuid := auth.uid();
  v_opp  volunteer_opportunities%rowtype;
  v_gender text;
  v_id uuid;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not is_active_volunteer(v_user) then raise exception 'NOT_VOLUNTEER'; end if;

  select * into v_opp from volunteer_opportunities where id = p_opportunity_id;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if v_opp.status <> 'open' then raise exception 'OPPORTUNITY_CLOSED'; end if;

  select gender into v_gender from profiles where id = v_user;
  if v_opp.target_gender is not null and v_opp.target_gender is distinct from v_gender then
    raise exception 'WRONG_GENDER';
  end if;

  if exists (
    select 1 from volunteer_applications
    where opportunity_id = p_opportunity_id and user_id = v_user
      and status in ('pending','accepted','rejected')
  ) then raise exception 'ALREADY_APPLIED'; end if;

  insert into volunteer_applications (opportunity_id, user_id, status)
  values (p_opportunity_id, v_user, 'pending')
  on conflict (opportunity_id, user_id) do update
    set status = 'pending', applied_at = now(),
        decided_by = null, decided_at = null, decision_reason = null
  returning id into v_id;

  return v_id;
end;
$$;

-- ١٢) سحبُ التقديم ما دام معلَّقًا
create or replace function public.withdraw_my_application(p_id uuid)
returns void
language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update volunteer_applications
  set status = 'withdrawn'
  where id = p_id and user_id = v_user and status = 'pending';
  if not found then raise exception 'NOT_WITHDRAWABLE'; end if;
end;
$$;

-- ١٣) الحراسة
alter table public.volunteers               enable row level security;
alter table public.volunteer_preferences    enable row level security;
alter table public.volunteer_opportunities  enable row level security;
alter table public.volunteer_applications   enable row level security;
alter table public.participation_certificates enable row level security;

drop policy if exists volunteers_select on public.volunteers;
create policy volunteers_select on public.volunteers for select
  using (user_id = auth.uid() or check_user_permission(auth.uid(), 'manage_volunteering'));

drop policy if exists volunteer_preferences_select on public.volunteer_preferences;
create policy volunteer_preferences_select on public.volunteer_preferences for select
  using (user_id = auth.uid() or check_user_permission(auth.uid(), 'manage_volunteering'));

-- الفرصةُ المسوّدة لصاحب القدرة وحده، والمفتوحةُ والمغلقةُ للمتطوّعين
drop policy if exists volunteer_opportunities_select on public.volunteer_opportunities;
create policy volunteer_opportunities_select on public.volunteer_opportunities for select
  using (
    check_user_permission(auth.uid(), 'manage_volunteering')
    or (status <> 'draft' and is_active_volunteer(auth.uid()))
  );

-- التقديماتُ لصاحب القدرة وحده: فيها `admin_note`، وقراءةُ المتطوّع لطلبه تجري من الخادم
-- بأعمدةٍ منتقاة (عُرفُ V2: الخادمُ يقرأ ويكتب، والمتصفّح يطلب).
drop policy if exists volunteer_applications_select on public.volunteer_applications;
create policy volunteer_applications_select on public.volunteer_applications for select
  using (check_user_permission(auth.uid(), 'manage_volunteering'));

drop policy if exists participation_certificates_select on public.participation_certificates;
create policy participation_certificates_select on public.participation_certificates for select
  using (user_id = auth.uid() or check_user_permission(auth.uid(), 'manage_volunteering'));
