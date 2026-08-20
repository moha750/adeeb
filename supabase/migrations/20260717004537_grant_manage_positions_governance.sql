-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260717004537   الاسم: grant_manage_positions_governance

-- قرار المالك (2026-07-16): إسناد المناصب لطبقة الحوكمة + قائد الموارد (لا رئيس النادي وحده).
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r, permissions p
where r.role_name in ('president_advisor','executive_council_president','hr_committee_leader')
  and p.permission_key = 'manage_positions'
  and not exists (select 1 from role_permissions rp where rp.role_id = r.id and rp.permission_id = p.id);
