-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260802155637   الاسم: seat_must_be_declared_by_its_unit

-- لا يُجلَس مقعدٌ في وحدةٍ لا تُصرّح به.
--
-- كانت الوحدة تُصرّح بقائدها (`leader_role_name`) وعضوها (`member_role_name`)، ولم يكن أحدٌ
-- يسأل الجدول عند الإسناد إلّا في القيادة. فمرّ «عضو لجنة» إلى **إدارةٍ إداريّة** — وهو
-- الخطأ القديم الذي قُبل به أعضاءٌ في الإدارة مباشرةً (ساره ادريس، صفٌّ مُرحَّلٌ من
-- نتائج العضويّة 2026-01-30، نُقلت إلى لجنة الفعاليات في 2026-08-02).
--
-- والحارس بابٌ واحدٌ لا استثناءٌ لكلّ حالة: المقعد يجب أن تكون الوحدة سمّته — قائدَها أو
-- عضوَها — أو يكون نائبَ قائدٍ في وحدةٍ قائدُها `committee_leader` (فالإدارات بلا نوّاب).
-- وقد فُحص الحيّ قبل الإغلاق: لا صفَّ يخالفه.
create or replace function public.enforce_seat_belongs_to_unit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not new.is_active or new.committee_id is null then return new; end if;

  if not exists (
    select 1 from committees c
    where c.id = new.committee_id
      and (c.leader_role_name = new.role_name
           or c.member_role_name = new.role_name
           or (new.role_name = 'deputy_committee_leader' and c.leader_role_name = 'committee_leader'))
  ) then
    raise exception 'هذه الوحدة لا تُصرّح بهذا المقعد: «%» لا يُجلَس في الوحدة رقم %.', new.role_name, new.committee_id
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_enforce_seat_belongs_to_unit on public.user_roles;
create trigger trg_enforce_seat_belongs_to_unit
before insert or update on public.user_roles
for each row execute function public.enforce_seat_belongs_to_unit();

-- وفي الباب نفسه: رسالةٌ تُقال قبل أن يصرخ الحارس.
create or replace function public.seat_declared_by_unit(p_role_name text, p_committee integer)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p_committee is null or exists (
    select 1 from committees c
    where c.id = p_committee
      and (c.leader_role_name = p_role_name
           or c.member_role_name = p_role_name
           or (p_role_name = 'deputy_committee_leader' and c.leader_role_name = 'committee_leader'))
  );
$function$;
