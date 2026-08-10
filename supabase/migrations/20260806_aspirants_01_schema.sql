-- ══════════════════════════════════════════════════════════════════════════════
-- م٥ — **الطامحون**: من «أريد العضويّة» إلى «صار عضوًا» بالعمل لا بالمقابلة
--
-- قرارُ المجلس (٢٠٢٦-٠٨-٠٦) بعد نقاشٍ طويل: لا مقابلةَ تحكم، ولا قروبَ انتظارٍ بلا معيار —
-- بل **نداءٌ بعملٍ حقيقيّ** من لجنةٍ تنقصها مهارة، يتطوّع له الطامحون، فمن أبلى نال العضويّة.
--
-- **وهنا يموت جذرُ أشباح المعلّقين**: كان الطلبُ يخلق هويّة، فالتقديمُ مرّتين بنفس البريد
-- يخلق حسابين. وقد صارت الهويّةُ أوّلًا (م١) والطلبُ صفًّا يشير إليها بقيدٍ **فريد** —
-- فالتكرارُ مستحيلٌ بنيويًّا لا ممنوعٌ بفحص.
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.membership_applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.profiles(id) on delete cascade,
  applied_at      timestamptz not null default now(),
  status          text not null default 'waiting' check (status in ('waiting', 'joined', 'withdrawn')),
  recommended_by  uuid references public.profiles(id),
  recommended_at  timestamptz,
  recommend_note  text,
  decided_by      uuid references public.profiles(id),
  decided_at      timestamptz,
  created_at      timestamptz not null default now()
);

comment on table public.membership_applications is
  'طلبُ العضويّة — صفٌّ يشير إلى صاحب حسابٍ قائم. لا حالةَ «مرفوض»: من لم يُقبل يبقى منتظرًا أو ينسحب بنفسه (قرار المجلس ٢٠٢٦-٠٨-٠٦).';

-- النداءُ المفتوح مهمّةٌ في الدفتر نفسِه — عمودان لا جدولٌ ثانٍ
alter table public.tasks add column if not exists open_to_public_at timestamptz;
alter table public.tasks add column if not exists slots integer check (slots is null or slots > 0);

comment on column public.tasks.open_to_public_at is
  'متى يُفتح النداءُ لغير الطامحين. قبله: الطامحون وحدهم — وأولويّتُهم هي قيمةُ وجودهم في القروب.';
comment on column public.tasks.slots is 'كم متطوّعًا يُختار. NULL = بلا سقف.';

insert into public.permissions (permission_key, permission_name_ar, description, category)
select 'manage_membership_applications', 'إدارة طلبات العضويّة', 'قبولُ الطامحين ومنحُهم العضويّة والمنصب', 'membership'
where not exists (select 1 from public.permissions where permission_key = 'manage_membership_applications');

insert into public.role_permissions (role_name, permission_id)
select r.role_name, p.id
from (values ('hr_committee_leader'), ('hr_admin_member'), ('club_president'), ('executive_council_president')) as r(role_name)
cross join public.permissions p
where p.permission_key = 'manage_membership_applications'
  and not exists (select 1 from public.role_permissions rp where rp.role_name = r.role_name and rp.permission_id = p.id);

-- رابطُ قروب الطامحين — يسكن مع أخويه في `site_settings` لا في آليّةٍ جديدة.
-- **والوصلةُ مقصودة**: القروبُ يُنادي والنظامُ يشهد؛ فمن قدّم رأى رابطَ القروب فورًا، ولولاه
-- لصار الانضمامُ خطوةً يدويّةً تُنسى.
insert into public.site_settings (setting_key, setting_value, setting_type, description, is_active)
select 'whatsapp_aspirants_group', '', 'text', 'رابطُ قروب الطامحين — يُعرَض لمن قدّم على العضويّة', true
where not exists (select 1 from public.site_settings where setting_key = 'whatsapp_aspirants_group');

alter table public.membership_applications enable row level security;

drop policy if exists membership_applications_select on public.membership_applications;
create policy membership_applications_select on public.membership_applications
  for select to authenticated
  using (
    user_id = auth.uid()
    or check_user_permission(auth.uid(), 'manage_membership_applications')
  );

revoke insert, update, delete on public.membership_applications from anon, authenticated;
revoke all on public.membership_applications from anon;
