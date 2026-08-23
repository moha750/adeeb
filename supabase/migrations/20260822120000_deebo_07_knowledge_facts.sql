-- ديبو — وقائعُه الثابتة تخرج من الكود إلى القاعدة (م٧)
--
-- ⚠️ مكتوبٌ ينتظر إذن المالك. لا يُنفَّذ إلّا بكلمته (قاعدةُ DDL).
--
-- ## ما الذي يتحرّك
-- معرفةُ ديبو مصدران: جدولُ `faq` (حيٌّ يُحرَّر من اللوحة)، و`STATIC_CHUNKS` في
-- `lib/deebo/knowledge.ts` — أربعةُ مقاطعَ محفورةٍ في الكود: أين أديب، ولمَ سُمّي،
-- وماذا في الموقع، وما ديبو. فتصحيحُ حرفٍ فيها كان نشرًا كاملًا، وسؤالُ المالك
-- ٢٠٢٦-٠٨-٢٢: **أن تصير هذه العمليّةُ في الواجهة**. فهذا الجدولُ بيتُها.
--
-- ## ولمَ لا يُنفَّذ `20260731_deebo_foundation` بدلًا منه
-- ذاك الملفُّ مكتوبٌ **ولم يُطبَّق قطّ**، وقد شاخ: يُنشئ `deebo_messages` بعمود
-- `chat_id`، والحيُّ اليومَ (من `deebo_01_conversations`) عمودُه `conversation_id`.
-- فتنفيذُه يُنشئ دوالَّ كتابةٍ تنادي أعمدةً لا وجودَ لها، ويرصّ على جدول الرسائل
-- الحيّ سياسةَ قراءةٍ بقدرةٍ أخرى. فأُخذ منه ما يخصّ المعرفةَ وحدَها، مقلَّمًا.
--
-- ## والقفلُ `manage_deebo` لا `manage_website`
-- غرفةُ ديبو قدرتُها مستقلّةٌ منذ ٢٠٢٦-٠٨-١٩، ومعرفتُه من غرفته: من يقرأ سجلَّ
-- محادثاته هو من يرى أين كذبت معرفتُه، فهو من يصلحها. ولا يُستعار قفلُ محتوى الموقع.
--
-- ## وقاعدةُ الجدول الحاكمة: لا رقمًا يتغيّر
-- عددُ أعضاءٍ أو اسمُ قائدٍ حاليّ أو تاريخُ فعاليّةٍ قادمة: كلُّها وعدٌ بأن يكذب ديبو
-- بعد شهور. الثابتُ وحده يُكتب، والمتغيّرُ يُقرأ من القاعدة لحظةَ السؤال. وحارسُ
-- `lib/deebo/guard.ts` يمسك ما ندّ: كلُّ عددٍ في الجواب لم يرد في المعرفة يُحجَب.

begin;

-- ═══ (١) الجدول ═════════════════════════════════════════════════════════════
create table if not exists public.deebo_knowledge (
  id          uuid primary key default gen_random_uuid(),
  -- معرّفٌ مستقرٌّ يُطبع مع المقطع في نصّ التوجيه. يُولَّد في الخادم (`fact-<n>`) ولا
  -- يُعرَض في الشاشة: اسمٌ داخليٌّ لا يعني كاتبَ الواقعة في شيء.
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  title       text not null check (length(btrim(title)) between 2 and 120),
  -- الحدُّ ١٢٠٠ محرفًا: المعرفةُ كلُّها تُحشى في كلّ سؤالٍ (لا بحثَ شعاعيّ قبل خمسين
  -- مقطعًا)، فمقطعٌ يتضخّم يُحاسَب في كلّ رسالةٍ من كلّ زائر.
  body        text not null check (length(btrim(body)) between 2 and 1200),
  sort        integer not null default 0,
  -- الإيقافُ لا الحذف: واقعةٌ تُخرَس اليومَ قد تعود غدًا، وحذفُها يفقد نصَّها.
  is_active   boolean not null default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.deebo_knowledge is
  'وقائعُ ديبو الثابتة — تُحرَّر من /dashboard/deebo/knowledge وتُحشى في نصّ توجيهه.';
comment on column public.deebo_knowledge.body is
  'ثابتٌ فقط. أيّ رقمٍ يتغيّر (عددُ أعضاء · تاريخُ فعاليّة) ممنوعٌ هنا — يُقرأ من القاعدة لحظةَ السؤال.';

create index if not exists deebo_knowledge_active_idx
  on public.deebo_knowledge (sort, created_at) where is_active;

-- ═══ (٢) الحراسة ════════════════════════════════════════════════════════════
-- القراءةُ للعموم لأنّ ديبو يُسأل من غير جلسة: مِنفذُ `/api/deebo` يبني التوجيه
-- بعميل الطلب نفسِه (زائرٌ بلا جلسة = anon)، فسياسةٌ تحجب عن anon تُخرِس ديبو كلَّه.
-- وليس فيها ما يُخفى: هذا نصٌّ يقوله ديبو لكلّ سائل.
alter table public.deebo_knowledge enable row level security;

drop policy if exists deebo_knowledge_read on public.deebo_knowledge;
create policy deebo_knowledge_read on public.deebo_knowledge
  for select to anon, authenticated
  using (is_active or check_user_permission((select auth.uid()), 'manage_deebo'));

-- والكتابةُ لصاحب الغرفة وحده. والغرفةُ تكتب بمفتاح الخدمة (كسائر غرف اللوحة،
-- والتفويضُ عند الباب)، فهذه السياساتُ حارسُ من ينادي القاعدةَ من المتصفّح مباشرةً.
drop policy if exists deebo_knowledge_write on public.deebo_knowledge;
create policy deebo_knowledge_write on public.deebo_knowledge
  for all to authenticated
  using (check_user_permission((select auth.uid()), 'manage_deebo'))
  with check (check_user_permission((select auth.uid()), 'manage_deebo'));

grant select on public.deebo_knowledge to anon, authenticated;
grant insert, update, delete on public.deebo_knowledge to authenticated;

-- ═══ (٣) ساعةُ التحديث ══════════════════════════════════════════════════════
drop trigger if exists deebo_knowledge_touch on public.deebo_knowledge;
create trigger deebo_knowledge_touch
  before update on public.deebo_knowledge
  for each row execute function public.set_updated_at_now();

-- ═══ (٤) البذرةُ: الأربعةُ كما كانت في الكود حرفًا بحرف ═════════════════════
-- تُنقل ولا تُعاد صياغتُها: هذا ما كان ديبو يقوله أمس، فلا يتبدّل قولُه بترحيلٍ
-- موضوعُه أين يسكن النصّ لا ما هو. و`on conflict do nothing` يجعل الترحيل مُعادًا
-- بلا أثر (idempotent) إن نُفِّذ مرّتين.
insert into public.deebo_knowledge (slug, title, body, sort) values
  ('where-we-are', 'أين أديب',
   'نادي أديب نادٍ طلّابيّ في جامعة الملك فيصل، ومقرّه الأحساء في المملكة العربيّة السعوديّة. وتنسيق الفعاليّات يجري مع عمادة شؤون الطلّاب.', 0),
  ('the-name', 'لماذا سُمّي أديب',
   'الاسم من الأدب، ومن الأديب: صاحب الحرف. والنادي يجمع من يرى في الكلمة متنفّسًا، في الشعر والنثر والقراءة وسائر فنون القول.', 1),
  ('what-the-site-offers', 'ماذا في موقع أديب',
   'في الموقع أبوابٌ يستطيع الزائر أن يقصدها بنفسه: صفحة الأخبار لما يُنشر، ومكتبة «إرثٌ يُروى» للقراءة، والإذاعة للاستماع، وصفحة الفعاليّات للحجز، وصفحة التواصل لمراسلة الإدارة.', 2),
  ('what-deebo-is', 'ما ديبو',
   'ديبو مساعدٌ آليّ في موقع نادي أديب، يجيب عمّا يخصّ النادي. ليس عضوًا في الإدارة ولا ناطقًا باسمها، ولا يملك بيانات الأعضاء ولا يطّلع عليها.', 3)
on conflict (slug) do nothing;

commit;
