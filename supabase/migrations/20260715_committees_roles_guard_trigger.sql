-- استبدال مفتاحَي committees->roles بتريغر — علاقة مفردة لا تلتبس على PostgREST.
--
-- ═══ لماذا ═══
--
-- committees تحمل مفتاحين إلى roles: leader_role_name وmember_role_name.
-- وPostgREST يستنتج التضمين من المفاتيح، فعلاقة committees->roles مزدوجة،
-- وأوّل من يكتب select('*, roles(...)') من committees يُردّ بـPGRST201.
--
-- لا كسر يوم كتابته (V2 يختار الأعمدة صراحةً ولا يضمّن roles من committees)،
-- لكنّها قنبلة نائمة — ونفس العلّة التي كسرت dashboard.js:3583 حيًّا عبر
-- المفتاح المركّب committees_department_council_fkey (أُسقط واستُبدل بتريغر).
--
-- **الدرس: المفتاح الأجنبيّ ليس إضافيًّا من منظور PostgREST.** المفتاح الثاني
-- إلى جدولٍ مُضمَّن يُبطِل كلّ تضمينٍ قائم. قبل أيّ FK ثانٍ: افحص
-- select('*, X(...)') في كلّ قارئ حيّ.
--
-- ═══ البديل ═══
-- تريغر يحرس العمودين، وتريغر ثانٍ على roles يسدّ الثغرة التي يفتحها إسقاط
-- الـFK (حذف دورٍ تُصرّح به وحدة).

alter table committees drop constraint if exists committees_leader_role_name_fkey;
alter table committees drop constraint if exists committees_member_role_name_fkey;

create or replace function public.enforce_committee_role_names()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if not exists (select 1 from roles where role_name = new.leader_role_name) then
    raise exception 'دور القيادة «%» غير موجود في roles', new.leader_role_name using errcode = '23503';
  end if;
  if not exists (select 1 from roles where role_name = new.member_role_name) then
    raise exception 'دور العضويّة «%» غير موجود في roles', new.member_role_name using errcode = '23503';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_committee_role_names() from public, anon, authenticated;

drop trigger if exists committees_role_names_guard on committees;
create trigger committees_role_names_guard
  before insert or update of leader_role_name, member_role_name on committees
  for each row execute function public.enforce_committee_role_names();

create or replace function public.prevent_delete_declared_role()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if exists (select 1 from committees where leader_role_name = old.role_name or member_role_name = old.role_name) then
    raise exception 'لا يمكن حذف الدور «%»: وحدةٌ تُصرّح به قائدًا أو عضويّةً لها', old.role_name using errcode = '23503';
  end if;
  if exists (select 1 from councils where head_role_name = old.role_name) then
    raise exception 'لا يمكن حذف الدور «%»: مجلسٌ يُصرّح به رئيسًا له', old.role_name using errcode = '23503';
  end if;
  return old;
end;
$$;
revoke all on function public.prevent_delete_declared_role() from public, anon, authenticated;

drop trigger if exists roles_declared_guard on roles;
create trigger roles_declared_guard
  before delete on roles
  for each row execute function public.prevent_delete_declared_role();

comment on function public.enforce_committee_role_names() is
  'يحرس leader_role_name وmember_role_name — بديل مفتاحَين أجنبيَّين كانا يجعلان committees->roles مزدوجة فتلتبس على PostgREST (PGRST201).';
