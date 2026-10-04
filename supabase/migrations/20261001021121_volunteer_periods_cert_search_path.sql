-- ════════════════════════════════════════════════════════════════════════
-- النسخة: 20261001021121   الاسم: volunteer_periods_cert_search_path
--
-- إصلاحٌ لهجرة الفترات كما طُبّقت أوّلَ مرّة: أعادت تعريفَ `issue_participation_certificate` بمسار
-- `public, pg_temp`، فسقط منه `extensions` الذي فيه `gen_random_bytes` (pgcrypto)، وهي سابقةُ
-- 20260815092827_certificate_serial_search_path_fix نفسُها. وملفُّ الفترات في المستودع صُحّح بعدها
-- فلا يُسقطه إن أُعيد تطبيقُه، وهذا الملفُّ مرآةُ ما جرى في القاعدة.
-- ════════════════════════════════════════════════════════════════════════
alter function public.issue_participation_certificate(uuid) set search_path to 'public', 'extensions', 'pg_temp';
