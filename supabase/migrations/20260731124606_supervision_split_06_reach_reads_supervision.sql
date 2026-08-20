-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260731124606   الاسم: supervision_split_06_reach_reads_supervision

-- حارس السلطة يتبع الإشراف إلى جدوله.
--
-- عند فصل الإشراف عن الانتماء (supervision_split_01..05) صار للعضو الإداريّ حقيقتان:
-- انتماؤه إلى إدارته صفٌّ في user_roles على الإدارة نفسها (committee_id = 22/23)، وإشرافُه
-- على لجانٍ تنفيذيّة صفوفٌ في committee_supervision. وبقيت member_within_reach تقرأ
-- الحقيقة القديمة — user_roles.committee_id بوصفه «اللجنة المُشرَف عليها» — وهو بعد الفصل
-- إدارتُه هو. فصارت الإدارة تشرف على نفسها: زملاء العضو في إدارته يقعون تحت سلطته
-- (يُنهي عضويّتهم)، وأعضاء لجانه الحقيقيّة يسقطون كلُّهم.
--
-- المصدر الواحد للإشراف هو committee_supervision — فتقرأه هي كما تقرؤه الشاشة.
create or replace function public.member_within_reach(p_actor uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p_actor is not null and p_target is not null and exists (
    select 1
    from user_roles a
    join membership_authority t on t.role_name = a.role_name
    where a.user_id = p_actor and a.is_active
      and case t.scope
        when 'all' then not exists (
          select 1 from user_roles v
          where v.user_id = p_target and v.is_active
            and v.role_name = any (t.blocked_roles)
        )
        -- «المُشرَف عليهم» = من كلُّ أدواره الحيّة عضويّةٌ عاديّة في لجنةٍ يشرف عليها الفاعل.
        -- فقائد اللجنة ونائبها يسقطان (دورهما ليس member_role_name)، ومن له دورٌ في لجنةٍ
        -- أخرى يسقط كلُّه — السلطة لا تتجزّأ على الشخص الواحد.
        when 'supervised' then
          exists (select 1 from user_roles v where v.user_id = p_target and v.is_active)
          and not exists (
            select 1 from user_roles v
            where v.user_id = p_target and v.is_active
              and not (
                v.committee_id is not null
                and exists (
                  select 1 from committees c
                  where c.id = v.committee_id and c.member_role_name = v.role_name
                )
                and exists (
                  select 1 from committee_supervision s
                  where s.supervisor_id = p_actor and s.committee_id = v.committee_id
                )
              )
          )
        else false
      end
  );
$function$;
