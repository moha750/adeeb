-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260717004224   الاسم: fix_leader_capability_gaps

-- إصلاح شذوذ «القائد أقلّ من عضو لجنته» قبل قلب الفرض: يُمنح كلّ قائدٍ ما يفتقده ممّا يملكه عضوه،
-- كي لا يقفله القلبُ عن عملٍ يقوم به مرؤوسه. (قرار المالك 2026-07-16)

-- قائد الموارد: يفتقد ٥ ممّا يملكه عضو الموارد.
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r, permissions p
where r.role_name = 'hr_committee_leader'
  and p.permission_key in ('approve_applications','manage_interviews','manage_registration','view_applications','view_membership_archives')
  and not exists (select 1 from role_permissions rp where rp.role_id = r.id and rp.permission_id = p.id);

-- قائد الضمان: يفتقد النشرة فقط ممّا يملكه عضو الضمان (خروجه من التوظيف تصحيحٌ مقصود لا خطأ).
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r, permissions p
where r.role_name = 'qa_committee_leader'
  and p.permission_key = 'manage_newsletter'
  and not exists (select 1 from role_permissions rp where rp.role_id = r.id and rp.permission_id = p.id);
