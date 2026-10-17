-- «بنك أدِيب» تحت `/games` كأخته (طلبُ المالك ٢٠٢٦-١٠-١٧): كان عنوانُها `/bank` قصيرًا لتابلت ركن المعرض،
-- فلمّا دخلت الصالة صار غيرَ متّسقٍ مع `/games/darbak-khadar/play`. و`/bank` تحويلٌ دائمٌ في `next.config.ts`.
--
-- ✅ مطبَّقٌ على الإنتاج ٢٠٢٦-١٠-١٧ (بأداة Supabase باسم `games_04_bank_path`، الإصدار 20261017110930).
update public.games set play_path = '/games/bank-adeeb/play' where slug = 'bank-adeeb';
