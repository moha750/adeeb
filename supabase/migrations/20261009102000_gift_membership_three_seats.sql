-- إهداءُ العضويّة بيد ثلاثة مقاعد وحدَها (قرار المالك ٢٠٢٦-١٠-٠٩)
--
-- الإهداءُ بتقدير المجلس الإداريّ لا بمعيارٍ مكتوب، والزرُّ لمن ينفّذ قرارَه: رئيسُ النادي
-- (`club_president`)، ورئيسُ المجلس التنفيذيّ (`executive_council_president`)، وقائدُ الموارد
-- البشريّة (`hr_committee_leader`). وكان أعضاءُ الموارد (`hr_admin_member`، ثمانيةٌ يومئذٍ) يملكونه
-- أيضًا، فيُهدي أحدُهم وحدَه. فتُنزع منهم القدرةُ وحدَها، ويبقى لهم `manage_volunteering`
-- (الفرصُ وسجلُّ المتطوّعين والشهادات) كما كان.
--
-- وحسابُ النادي (`adeeb_admin`) باقٍ عليها: استثناءٌ مؤسّسيّ يملك مفاتيحَ النظام كلَّها.
--
-- نُفّذ من جهاز المالك بمفتاح الخدمة (أداةُ Supabase في جلسة الوكيل تحبس أوامرَ الحذف)،
-- وسُجّل في schema_migrations بسطرٍ شاهد.

delete from public.role_permissions rp
using public.permissions p
where rp.permission_id = p.id
  and p.permission_key = 'manage_membership_applications'
  and rp.role_name = 'hr_admin_member';
