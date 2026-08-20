-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260810220352   الاسم: bare_rank_02a_home_unit_constraint

create or replace function public.enforce_home_unit_match()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_home integer;
  v_name text;
begin
  select r.home_committee_id into v_home from public.roles r where r.role_name = new.role_name;
  if v_home is null then return new; end if;

  if new.committee_id is distinct from v_home then
    select c.committee_name_ar into v_name from public.committees c where c.id = v_home;
    raise exception 'المنصب «%» لا يُسنَد إلّا في %', new.role_name, coalesce(v_name, v_home::text)
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_enforce_home_unit_match on public.user_roles;
create trigger trg_enforce_home_unit_match
  before insert or update of role_name, committee_id on public.user_roles
  for each row execute function public.enforce_home_unit_match();

comment on function public.enforce_home_unit_match() is
  'من له وحدةٌ ملازمة لا يُسنَد إلى غيرها — فيتطابق مسمّى الشخص ومسمّى مقعده بالضرورة (20260811).';

comment on column public.roles.home_committee_id is
  'وحدةُ المنصب الملازمة — لتسمية مقعدٍ بلا شاغل ولقيد الإسناد فقط. ولا تدخل مسمّى شخصٍ البتّة: وحدةُ الشخص من خانة إسناده (lib/positionLabel).';
