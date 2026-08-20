-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260803102920   الاسم: wallet_preview_temp_tables

-- ═══════════════════════════════════════════════════════════════════════════
-- بطاقة الولاء — جدولان **مؤقّتان** لمعاينةٍ تُحذف.
--
-- البادئة `wallet_preview_` إعلانٌ لا تسمية: هذان يُسقَطان مع مجلّد
-- `src/app/wallet-preview/`، ولا يُبنى عليهما شيء. ولولا التحديث اللحظيّ في
-- المحفظة لَما وُجدا أصلًا — رمزُ الدفع يصل عند تسجيل الجهاز، والدفعةُ تُرسَل
-- بعده بساعة، فلا بدّ من موضعٍ يحفظه.
--
-- ولا سياسةَ RLS البتّة: الجدولان محروسان بالكامل، ولا يبلغهما إلّا دورُ الخدمة
-- من مسارات الخادم. فلا عميلٌ يقرأ ولا يكتب.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.wallet_preview_cards (
  serial      text primary key,
  stamps      int  not null default 0 check (stamps between 0 and 10),
  cycles      int  not null default 0 check (cycles >= 0),
  updated_at  timestamptz not null default now()
);

comment on table public.wallet_preview_cards is
  'مؤقّت — حالةُ بطاقات معاينة الولاء. يُسقَط مع مجلّد src/app/wallet-preview.';

create table if not exists public.wallet_preview_devices (
  -- معرّف الجهاز كما تعطيه أبل (لا يخصّ المستخدم ولا يُعرّفه)
  device_id   text not null,
  serial      text not null references public.wallet_preview_cards(serial) on delete cascade,
  -- رمزُ الدفع — يتغيّر، فيُحدَّث عند كلّ تسجيل
  push_token  text not null,
  created_at  timestamptz not null default now(),
  primary key (device_id, serial)
);

comment on table public.wallet_preview_devices is
  'مؤقّت — أجهزةٌ سجّلت بطاقةَ معاينة، ورموزُ دفعها. يُسقَط مع المجلّد.';

-- البحثُ الغالب: «أعطني أجهزةَ هذه البطاقة لأدفع إليها»
create index if not exists wallet_preview_devices_serial_idx
  on public.wallet_preview_devices (serial);

alter table public.wallet_preview_cards   enable row level security;
alter table public.wallet_preview_devices enable row level security;

-- بذرةُ الأربعة الوهميّين — بالقيم نفسها التي في `demo.ts`، وهو المصدر المعروض.
insert into public.wallet_preview_cards (serial, stamps, cycles) values
  ('ADEEB-CARD-2026-0117', 10, 2),
  ('ADEEB-CARD-2026-0233',  7, 1),
  ('ADEEB-CARD-2026-0341',  3, 0),
  ('ADEEB-CARD-2026-0402',  0, 0)
on conflict (serial) do nothing;
