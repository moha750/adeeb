-- «ركضة وطن» — حذفُ رمز الاسترجاع من القاعدة نهائيًّا (قرارُ المالك ٢٠٢٦-٠٩-٢٥، ووافق على الحذف من
-- الإنتاج بالاسم: «نعم، طبّق الحذف على الإنتاج»). يُطبَّق بعد نزول الموقع الذي لا يناديها (الإيداع 82b8f71):
-- التسجيلُ بأربعة معاملات (`watan_05a`)، وبابا `code` و`restore` محذوفان.
-- ✅ مطبَّقٌ على الإنتاج بهذه النسخة (20260925134050).
drop function if exists public.watan_register(text, uuid, text, text, text);
drop function if exists public.watan_restore(text, text, text);
drop function if exists public.watan_set_code(text, uuid, text);
drop table if exists public.watan_restore_tries;
alter table public.watan_players drop column if exists recovery_hash;
