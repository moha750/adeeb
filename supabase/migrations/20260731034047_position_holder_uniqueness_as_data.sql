-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260731034047   الاسم: position_holder_uniqueness_as_data

-- تفرّد المناصب: من قائمةٍ محفورة داخل دالّة، إلى عمودٍ في الكتالوج يقرؤه الجميع.
-- (١) القانون بيانًا: كم شاغلًا يقبل الدور، وفي أيّ نطاق.
alter table public.roles add column if not exists holder_uniqueness text not null default 'multi';

alter table public.roles drop constraint if exists roles_holder_uniqueness_check;
alter table public.roles add constraint roles_holder_uniqueness_check
  check (holder_uniqueness in ('global','per_committee','per_department','multi'));

comment on column public.roles.holder_uniqueness is
  'نطاق تفرّد المنصب: global = شاغلٌ واحد في النادي · per_committee = واحد لكلّ لجنة · per_department = واحد لكلّ قسم · multi = يقبل أكثر من شاغل. مصدرٌ واحد تقرؤه assign_position وحارسُ الجدول والواجهة.';

update public.roles set holder_uniqueness = 'global'
 where role_name in ('club_president','executive_council_president','hr_committee_leader','qa_committee_leader');
update public.roles set holder_uniqueness = 'per_committee'
 where role_name in ('committee_leader','deputy_committee_leader','hr_admin_member','qa_admin_member');
update public.roles set holder_uniqueness = 'per_department'
 where role_name in ('department_head');
update public.roles set holder_uniqueness = 'multi'
 where role_name in ('committee_member','president_advisor','activity_coordinator');

-- (٢) الحارس: يسري على كلّ كتابة — الدالّة أو INSERT مباشر أو مفتاح الخدمة.
create or replace function public.enforce_position_uniqueness()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uniq  text;
  v_other uuid;
begin
  -- الصفّ الميّت لا يشغل مقعدًا؛ التفرّد على الأحياء وحدهم.
  if not new.is_active then return new; end if;

  select holder_uniqueness into v_uniq from roles where id = new.role_id;
  if v_uniq is null or v_uniq = 'multi' then return new; end if;

  select ur.user_id into v_other
  from user_roles ur
  where ur.role_id = new.role_id
    and ur.is_active
    and ur.id is distinct from new.id
    and ur.user_id <> new.user_id
    and (v_uniq <> 'per_committee'  or ur.committee_id  is not distinct from new.committee_id)
    and (v_uniq <> 'per_department' or ur.department_id is not distinct from new.department_id)
  limit 1;

  if v_other is not null then
    raise exception 'المنصب مشغول: هذا الدور لا يقبل أكثر من شاغلٍ واحد في هذا النطاق. أزِل الشاغل الحاليّ أو استعمل assign_position بالاستبدال.'
      using errcode = '23505';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_enforce_position_uniqueness on public.user_roles;
create trigger trg_enforce_position_uniqueness
  before insert or update on public.user_roles
  for each row execute function public.enforce_position_uniqueness();
