-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260731124633   الاسم: supervised_tab_open_to_qa_read_only

-- مشرف الضمان يرى من يشرف عليهم — قراءةً بلا سلطة (قرار المالك 2026-07-31).
--
-- كان يشرف على تسع لجانٍ ولا يرى منها شيئًا: الشاشة كانت محجوبةً عنه بالقدرة.
-- ويبقى بلا صفٍّ في membership_authority عمدًا — فلا «إنهاء عضويّة» ولا «تعديل بيانات»
-- يظهران له: can_end_membership/can_edit_member_data تردّانه، والشاشة تُخفي ما تردّه القاعدة.
insert into role_permissions (role_name, permission_id)
select 'qa_admin_member', id from permissions where permission_key = 'view_supervised_members'
on conflict do nothing;
