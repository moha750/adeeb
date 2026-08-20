-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260803114000   الاسم: wallet_preview_device_last_poll

-- مِجسُّ تشخيص (مؤقّت كالجدول): متى آخرُ مرّةٍ استيقظ فيها الجهاز وسألنا «أيّ بطاقاتي
-- تغيّرت؟». به يُفرَّق بين علّتين تتشابهان من الخارج: **الدفعة لم تصل** (العمود لا
-- يتحرّك)، و**وصلت والجلبُ أخفق** (يتحرّك ولا تتغيّر البطاقة).
alter table public.wallet_preview_devices
  add column if not exists last_poll_at timestamptz;

comment on column public.wallet_preview_devices.last_poll_at is
  'مؤقّت — آخرُ استيقاظٍ للجهاز سأل فيه عن المتغيّر. للتشخيص لا للسلوك.';
