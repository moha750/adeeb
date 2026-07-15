-- استبدال المفتاح المركّب بتريغر — يحرس نفس الثابت بلا كسر PostgREST.
--
-- ═══ ماذا كسر ═══
--
-- المفتاح المركّب committees_department_council_fkey (department_id, council_id)
--   -> departments (id, council_id) كان يفرض «لا تخالف لجنةٌ مجلسَ قسمها»
-- إعلانيًّا وبلا تريغر — وهو أنيق في القاعدة.
--
-- لكنّه جعل علاقة committees -> departments **مزدوجة**، وPostgREST يستنتج
-- التضمين من المفاتيح الأجنبيّة. فكلّ استعلامٍ يضمّن القسمَ داخل اللجنة صار
-- يُردّ بـ PGRST201 «more than one relationship was found»:
--   admin/dashboard.js:3583  .select('*, departments(name_ar)')
-- مقيس حيًّا على الإنتاج 2026-07-15 — كسرٌ حقيقيّ في الموقع الحيّ، دام ساعات.
--
-- **الدرس: إضافة مفتاحٍ أجنبيّ ليست إضافيّة من منظور PostgREST.** المفتاح
-- الثاني إلى جدولٍ مُضمَّن يُبطِل كلّ تضمينٍ قائم — لا يكسره تغييرُ عمود، بل
-- وجودُ خيارَين. قبل أيّ FK ثانٍ: افحص `select('*, X(...)')` في كلّ قارئ حيّ.
--
-- ═══ البديل ═══
--
-- تريغر يفرض الثابت نفسه. أقلّ أناقةً، لكنّه لا يظهر في خريطة علاقات
-- PostgREST فلا يلتبس تضمين.
-- (department_id = NULL يمرّ — وهو ما تحتاجه الإدارتان 22/23، كسلوك
--  MATCH SIMPLE في المفتاح المُسقَط تمامًا.)

alter table committees drop constraint if exists committees_department_council_fkey;
alter table departments drop constraint if exists departments_id_council_id_key;

create or replace function public.enforce_committee_council_matches_department()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_dept_council text;
begin
  if new.department_id is null then
    return new;  -- إدارة تتبع مجلسها مباشرةً — لا قسم تطابقه
  end if;

  select council_id into v_dept_council from departments where id = new.department_id;

  if v_dept_council is not null and new.council_id is distinct from v_dept_council then
    raise exception 'مجلس اللجنة (%) يخالف مجلس قسمها (%)', new.council_id, v_dept_council
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_committee_council_matches_department() from public, anon, authenticated;

drop trigger if exists committees_council_guard on committees;
create trigger committees_council_guard
  before insert or update of department_id, council_id on committees
  for each row execute function public.enforce_committee_council_matches_department();

-- والاتجاه الآخر: تغيير مجلس القسم يجب ألّا يُيتّم لجانه
create or replace function public.enforce_department_council_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.council_id is distinct from old.council_id
     and exists (select 1 from committees where department_id = new.id and council_id is distinct from new.council_id) then
    raise exception 'لا يمكن تغيير مجلس القسم: لجانه تتبع المجلس القديم'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_department_council_change() from public, anon, authenticated;

drop trigger if exists departments_council_guard on departments;
create trigger departments_council_guard
  before update of council_id on departments
  for each row execute function public.enforce_department_council_change();

comment on function public.enforce_committee_council_matches_department() is
  'يحرس: لجنةٌ لها قسم يجب أن يطابق مجلسُها مجلسَ قسمها. بديل المفتاح المركّب الذي كسر تضمين PostgREST (PGRST201).';
