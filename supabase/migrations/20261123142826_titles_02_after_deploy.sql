-- توحيد مسمّيات المناصب (2 من 2): الرتبُ الجديدة — طُبّق بعد رفع الكود الجديد (2026-11-23)
--
-- الكودُ الحيّ القديم كان يُلحق اسمَ الوحدة بكلّ رتبة، فلو طُبِّق هذا قبله لقُرئ «مشرف الموارد البشرية إدارة
-- الموارد البشرية». والكودُ الجديد (`positionLine` بقاعدة المسمّى التامّ) يقرأ الحالين سليمًا، فرُفع أوّلًا
-- (PR #22) ثمّ طُبِّق هذا.
--
-- قبلُه (titles_01_twin): التوأمان `rank_for` و`position_title`، والدوالُّ التي تقرأ منهما،
-- و`_retitle` للمسمّى المحفوظ.

-- (1) المقاعدُ الثلاثة بمسمّياتها التامّة. قيدُ `roles_rank_is_bare` يبقى صالحًا: لا «لجنة/قسم/إدارة» فيها.
update roles set role_name_ar = case role_name
  when 'hr_admin_member'   then 'مشرف الموارد البشرية'
  when 'qa_admin_member'   then 'مشرف الضمان والجودة'
  when 'exec_admin_member' then 'عضو تنفيذي'
end
where role_name in ('hr_admin_member', 'qa_admin_member', 'exec_admin_member');

-- (2) ما صدر من شهاداتٍ بين الترحيلين بالصيغة القديمة («عضو إدارة الموارد البشرية»…) يُعاد تسميتُه،
--     ويشهد بذلك `activity_log` كما في الترحيل الأوّل.
with changed as (
  update experience_certificates c
     set position_title = public._retitle(c.position_title, p.gender)
    from profiles p
   where p.id = c.user_id
     and public._retitle(c.position_title, p.gender) is distinct from c.position_title
  returning c.id, c.user_id, c.serial, c.position_title
)
insert into activity_log (user_id, action_type, target_type, target_id, details)
select null, 'retitle_certificate', 'profile', ch.user_id::text,
       jsonb_build_object('certificate_id', ch.id, 'serial', ch.serial, 'position', ch.position_title,
                          'why', 'توحيد مسمّيات المناصب (2026-11-23): الشهادةُ تحمل المسمّى بصيغته الجديدة')
from changed ch;
