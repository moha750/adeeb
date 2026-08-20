-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260803115639   الاسم: wallet_preview_fetch_probe

-- مِجسٌّ ثانٍ (مؤقّت): ماذا جرى في **آخر خطوة** — حين يأتي الجهاز يجلب النسخة الجديدة.
-- الأوّل أثبت أنّ الدفعة تصل وأنّ الجهاز يستيقظ ويسأل؛ وهذا يقول: أجاء يجلب؟ وبِمَ رددنا؟
alter table public.wallet_preview_cards
  add column if not exists last_fetch_at timestamptz,
  add column if not exists last_fetch_note text;

comment on column public.wallet_preview_cards.last_fetch_at is
  'مؤقّت — آخرُ مجيءٍ للجهاز يطلب النسخة. للتشخيص لا للسلوك.';
comment on column public.wallet_preview_cards.last_fetch_note is
  'مؤقّت — بِمَ رددنا عليه (٢٠٠ أو ٣٠٤ أو ٤٠١) وما أرسله من If-Modified-Since.';
