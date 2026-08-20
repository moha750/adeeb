-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260803115810   الاسم: wallet_preview_apple_log

-- سجلُّ أبل (مؤقّت): الجهاز يُرسل إلى `/w/v1/log` كلَّ ما يعترضه — توقيعٌ لم يُقبَل،
-- ردٌّ لم يُفهَم، رمزٌ رُفض. كان يُكتب في سجلّ Vercel وحده فلا يُقرأ من هنا؛ فصار صفوفًا.
create table if not exists public.wallet_preview_log (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  line       text not null
);

comment on table public.wallet_preview_log is
  'مؤقّت — ما تقوله أبل عن أعطال البطاقة. يُسقَط مع مجلّد src/app/wallet-preview.';

alter table public.wallet_preview_log enable row level security;
