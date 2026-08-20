-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260720000704   الاسم: library_05_grant_capability

-- منح قدرة إدارة المكتبة لحاملي manage_website (رئيس النادي + مستشار الرئيس)،
-- وكلاهما يملك view_members فيدخل اللوحة. يوسّعها المالك لاحقًا لمن يشاء.
insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.id
from (values (1), (22)) as r(role_id)
cross join public.permissions p
where p.permission_key = 'manage_library'
on conflict do nothing;
