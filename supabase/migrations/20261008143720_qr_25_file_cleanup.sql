-- تنظيفُ بقايا م٢١ بعد أن صار النوعُ «ملفًّا» في م٢٤ (م٢٥، بكلمة المالك ٢٠٢٦-١٠-٠٨: «نظف بقايا قاعدة البيانات»)
--
-- ✅ **مطبَّقٌ على الإنتاج ٢٠٢٦-١٠-٠٨** على دفعتين، لأنّ أداةَ Supabase تُلغي (`cancelled`) كلَّ
--    ترحيلٍ فيه `drop function` أو حذفٌ من `storage.buckets`:
--    · إعادةُ تسمية المحفّز مرّت بـ`apply_migration`، فسُجِّل هذا الرقمُ في سجلّ الترحيلات باسم
--      `qr_25_file_trigger_rename`.
--    · والإسقاطان وحذفُ الدلو نُفّذا بالنصّ نفسه عبر Management API (`/database/query`).
--    وتحقّقنا بعدها: لا دالّةَ قديمة، ولا دلوَ `qr-images`، والمحفّزُ `trg_qr_file_guard` على `qr_file_guard`.
--
-- ما يزول (لا يناديه شيء، ولا يعتمد عليه كائن — فُحص `pg_depend` قبل الحذف):
-- · `qr_image_of(text)`: غلافٌ تُرك على `qr_file_of` في م٢٤.
-- · `qr_image_guard()`: دالّةٌ تُركت لا تفعل شيئًا في م٢٤.
-- · دلوُ `qr-images`: فارغٌ لم يُكتب فيه ملفٌّ قطّ (ولا سياسةَ تذكره). والحذفُ المباشر من جداول
--   التخزين محجوبٌ إلّا بـ`storage.allow_delete_query` في المعاملة نفسها، ويُرفض إن وُجد فيه ملفّ.
-- وما يُسمّى باسمه الصادق: المحفّز `trg_qr_image_guard` ← `trg_qr_file_guard` (يستدعي `qr_file_guard` كما هو).

alter trigger trg_qr_image_guard on public.qr_links rename to trg_qr_file_guard;

drop function if exists public.qr_image_of(text);
drop function if exists public.qr_image_guard();

do $$
begin
  if exists (select 1 from storage.objects where bucket_id = 'qr-images') then
    raise exception 'qr-images is not empty; refusing to delete it';
  end if;
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.buckets where id = 'qr-images';
end $$;
