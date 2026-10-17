-- ═══════════════════════════════════════════════════════════════════════════
-- «عِرفان» ٧ (٢٠٢٦-١٠-١٧) — **قدرةُ إشراف عِرفان** (`oversee_irfan`).
--
-- قرارُ المالك: «أنا الرئيس، فمن المهمّ أن أعرف لأجل الإحصاء». صفحةٌ فيها رسائلُ الموسم كلُّها بنصوصها
-- وأرقامُها (`/dashboard/irfan/oversight`)، لرئيس أدِيب وحده، ولدور «أَدِيب» الذي يحمل كلَّ مفتاحٍ بالعادة.
-- والقراءةُ بمفتاح الخدمة بعد أن يحرس `denyUnless` البابَ بهذه القدرة؛ فلا سياسةَ قراءةٍ جديدةَ على
-- `irfan_messages`، ولا يرى غيرُه من المتصفّح إلّا ما كان يرى (رسائلَه مرسلًا أو مستلمًا).
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.permissions (permission_key, permission_name_ar, description, category)
select 'oversee_irfan', 'الإشراف على عِرفان',
       'قراءةُ رسائل عِرفان كلِّها بنصوصها وأرقام موسمها: من كتب، ولمن، ومتى، وهل قُرئت', 'portal'
where not exists (select 1 from public.permissions where permission_key = 'oversee_irfan');

insert into public.role_permissions (role_name, permission_id)
select r.role_name, p.id
from public.permissions p
cross join (values ('club_president'), ('adeeb_admin')) as r(role_name)
where p.permission_key = 'oversee_irfan'
  and not exists (
    select 1 from public.role_permissions rp where rp.role_name = r.role_name and rp.permission_id = p.id
  );
