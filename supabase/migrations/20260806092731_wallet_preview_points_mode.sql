-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260806092731   الاسم: wallet_preview_points_mode

-- **محاكاةُ نظام النقاط بجانب الأختام** — ليقارن المالك بينهما على جهازه لا في ذهنه.
--
-- وبطاقةُ النقاط **صفٌّ مستقلٌّ برقمٍ مستقلّ** (`ADEEB-PTS-…`) لا حالةٌ أخرى للصفّ نفسِه:
-- البطاقةُ في المحفظة تُعرَّف برقمها، فلو حملتا رقمًا واحدًا لَحلّت إحداهما محلّ الأخرى
-- في الجهاز — والمرادُ أن تعيشا معًا فتُقارَنا بالعين.
--
-- والعمودان الجديدان لصفوف النقاط وحدها، كما أنّ `stamps`/`cycles` لصفوف الأختام
-- وحدها. فكلُّ صفٍّ يستعمل نصفَ الجدول الذي يخصّ عائلتَه، ولا يُحمَّل عمودٌ معنيين.

alter table public.wallet_preview_cards
  add column if not exists points       integer not null default 0 check (points >= 0),
  add column if not exists redemptions  integer not null default 0 check (redemptions >= 0);

comment on column public.wallet_preview_cards.points is
  'رصيدُ النقاط — لصفوف بطاقات النقاط (ADEEB-PTS-…) وحدها.';
comment on column public.wallet_preview_cards.redemptions is
  'كم مكافأةً صرفها — لصفوف بطاقات النقاط وحدها.';

-- بذرُ الثلاثة بأرصدةٍ تغطّي ثلاث حالات: يكفي مكافأتين · يكفي واحدة · لم يبلغ شيئًا بعد.
insert into public.wallet_preview_cards (serial, stamps, cycles, points, redemptions)
values
  ('ADEEB-PTS-2026-0117', 0, 0, 640, 2),
  ('ADEEB-PTS-2026-0233', 0, 0, 240, 1),
  ('ADEEB-PTS-2026-0341', 0, 0,  55, 0)
on conflict (serial) do nothing;
