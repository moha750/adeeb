-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260804080834   الاسم: execute_pending_onboarding_status

-- إعدام حالة `pending_onboarding` (٢٠٢٦-٠٨-٠٤)
--
-- كانت الحالة تعني «حسابٌ بلا سجلّ member_details»، وبابُها الوحيدُ الذي يُخرج منها هو
-- `/onboarding` — وقد نُحر مع نظام التسجيل. فحالةٌ لا مخرجَ لها سجنٌ لا انتظار.
-- والنقصُ صار يُقرأ من غياب صفّ `member_details` لا من عمود الحالة، ويُطالَب به عند أوّل
-- دخولٍ إلى اللوحة (بوّابة `/complete`).

-- ١) العشرون يصيرون نشطين. (حارس guard_membership_status_gate يخصّ suspended وحدها فلا يعترض.)
update profiles set account_status = 'active' where account_status = 'pending_onboarding';

-- ٢) المفردات تعود ثلاثًا
alter table profiles drop constraint profiles_account_status_check;
alter table profiles add constraint profiles_account_status_check
  check (account_status = any (array['active'::text, 'inactive'::text, 'suspended'::text]));

-- ٣) الشهادات: الاستثناءُ سقط بسقوط الحالة
create or replace function public.certificate_targets(p_actor uuid)
 returns table(user_id uuid, name text, suggested_name text, avatar text, gender text, phone text, account_status text, position_title text, joined_date date, issued_count integer)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select
    p.id,
    p.full_name,
    coalesce(nullif(btrim(md.full_name_triple), ''), btrim(p.full_name)),
    p.avatar_url,
    p.gender,
    p.phone,
    p.account_status,
    position_title_of(p.id),
    p.joined_date,
    (select count(*)::int from experience_certificates c where c.user_id = p.id and c.status = 'valid')
  from profiles p
  left join member_details md on md.user_id = p.id
  where can_issue_certificate(p_actor, p.id)
  order by p.full_name;
$function$;

-- ٤) دالّتا القائمة المُعدَمة — لا مستدعيَ لهما في V2
drop function if exists public.get_pending_members();
drop function if exists public.find_pending_member_duplicates();

-- ٥) صلاحيّة التبويب المُعدَم
delete from role_permissions where permission_id in (select id from permissions where permission_key = 'view_pending_members');
delete from user_specific_permissions where permission_id in (select id from permissions where permission_key = 'view_pending_members');
delete from permissions where permission_key = 'view_pending_members';
