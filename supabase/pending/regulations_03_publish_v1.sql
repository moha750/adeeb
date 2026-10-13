-- أنظمةُ أدِيب ٠٣: نشرُ الإصدار الأوّل يومَ تُفتح الصفحةُ العلنيّة
--
-- ⚠️ لا يُطبَّق إلّا مع نشر `/regulations` للعموم، بكلمة المالك.
-- النصوصُ «تسري من تاريخ نشرها في «أنظمة أدِيب»»، فتاريخُ النفاذ يومُ هذا التطبيق بتوقيت الرياض.
-- وبعده تتجمّد النسخُ: لا تُعدَّل ولا تُحذف، والتعديلُ نسخةٌ جديدة.

begin;

update public.regulation_versions v
set status = 'published',
    effective_from = (now() at time zone 'Asia/Riyadh')::date
from public.regulations r
where r.id = v.regulation_id and v.version_no = 1 and v.status = 'draft';

do $chk$
declare n int;
begin
  select count(*) into n from public.regulations_current;
  if n <> 7 then raise exception 'السارية % لا ٧', n; end if;
end $chk$;

commit;
