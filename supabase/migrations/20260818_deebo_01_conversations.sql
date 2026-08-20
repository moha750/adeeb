-- ديبو — سجلُّ المحادثات (م٠)
--
-- ⚠️ مكتوبٌ ينتظر إذن المالك. لا يُنفَّذ إلّا بكلمته (قاعدةُ DDL).
--
-- ## لماذا يُسجَّل أصلًا
-- قرارُ المالك ٢٠٢٦-٠٨-١٨. وعلّتُه أنّ أوّلَ مئة سؤالٍ يتلقّاها ديبو هي أثمنُ ما
-- سنملك: تُري بمَ يُسأل النادي حقًّا، وأين تكذب معرفتُه، وما ينقص جدول `faq`.
-- ومن لم يسجّل بنى معرفتَه على التخمين.
--
-- ## ولماذا لا يُحذف
-- بأمر المالك في التاريخ نفسِه: **لا حذفَ بعد أجل**، خلافًا للتوصية الأولى
-- (٩٠ يومًا). فلا مهمّةَ `pg_cron` هنا ولا عمودَ انتهاء.
--
-- ## وكيف يبقى أبديًّا بلا أن يصير عبئًا
-- الخطرُ في الحفظ الأبديّ ليس قِدَم الصفّ بل **ما يشير إلى قائله**. وحذفُ
-- التسعين يومًا كان بديلًا خشنًا عن معالجة ذلك. فالعلاجُ في موضعه:
--   · **لا عنوانَ IP خامًا في أيّ صفّ.** البصمةُ `sha256(ip‖salt‖تاريخ اليوم)`.
--   · وإقحامُ **تاريخ اليوم** في البصمة يجعلها **تدور كلّ يوم**: تكفي لمنع
--     استنزاف الرصيد خلال الساعة، ولا تصلح لوصل زيارتَي أمسِ واليوم بشخصٍ واحد.
--     أي أنّ الأبديّةَ تحفظ **ما قيل** ولا تحفظ **من قاله**.
--   · ولا عمودَ لاسمٍ ولا بريدٍ ولا معرّف عضو. ديبو للزائر المجهول.
--
-- ## والكتابةُ خادميّةٌ محضة
-- لا سياسةَ إدراجٍ لأحد. المِنفذ `/api/deebo` يكتب بمفتاح الخدمة (يتجاوز RLS)،
-- وسياساتُ القراءة وحدها معرَّفة. وهذا إعمالٌ لدرس Turnstile: ما دامت سياسةٌ
-- تسمح بإدراجٍ من المتصفّح فالدرعُ زينة.

begin;

-- ═══ (١) قدرةُ الغرفة ═══════════════════════════════════════════════════════
-- قدرةٌ مستقلّة لا إعادةُ استعمالٍ لـ`manage_faq`: الغرفةُ ستكبر (قراءةُ السجلّ
-- اليوم، وتحريرُ الشخصيّة والمعرفة غدًا)، وعُرفُ اللوحة قدرةٌ لكلّ غرفة.
-- `permission_name_ar` و`category` كلاهما NOT NULL في الجدول (أُمسك 2026-08-19 عند التطبيق:
-- كان الإدراجُ يذكر المفتاحَ والوصفَ وحدهما فسقطت المعاملةُ كلُّها). والفئةُ فئةٌ مستقلّةٌ
-- على عُرف `radio` و`volunteering`: قدرةٌ واحدةٌ لكلّ مجال.
insert into public.permissions (permission_key, permission_name_ar, description, category)
values ('manage_deebo', 'إدارة ديبو', 'إدارةُ ديبو: قراءةُ سجلّ المحادثات ورعايةُ معرفته', 'deebo')
on conflict (permission_key) do nothing;

-- تُمنَح لمن يرعى المعرفة اليوم (صاحبُ `manage_faq` وحده: رئيس النادي).
-- وتوسيعُها بعدُ من غرفة الصلاحيّات لا بترحيلٍ جديد.
insert into public.role_permissions (role_name, permission_id)
select 'club_president', id from public.permissions where permission_key = 'manage_deebo'
on conflict (role_name, permission_id) do nothing;

-- ═══ (٢) المحادثة ══════════════════════════════════════════════════════════
create table if not exists public.deebo_conversations (
  id                  uuid primary key default gen_random_uuid(),
  started_at          timestamptz not null default now(),
  last_at             timestamptz not null default now(),

  -- بصمةٌ تدور يوميًّا. ليست هويّةً ولا تصلح لها. انظر رأس الملفّ.
  visitor_hash        text        not null,

  -- من أين بدأت: صفحةُ ديبو أم فقاعةٌ في صفحةٍ أخرى. يُقرأ منه أيُّ الموضعين يُستعمل.
  entry_path          text,

  -- النموذجُ الذي أجاب. يبقى في الصفّ كي لا يُقارَن جوابُ نموذجٍ بجواب آخر ظُلمًا
  -- حين نبدّل المزوّد (والتبديلُ سطر، فالخلطُ وارد).
  model               text        not null,

  message_count       integer     not null default 0,
  total_input_tokens  integer     not null default 0,
  total_output_tokens integer     not null default 0,
  total_cached_tokens integer     not null default 0
);

comment on table public.deebo_conversations is
  'محادثاتُ ديبو. تبقى بلا أجل بأمر المالك ٢٠٢٦-٠٨-١٨، والبصمةُ تدور يوميًّا فلا تشير إلى شخص.';

-- ═══ (٣) الرسالة ═══════════════════════════════════════════════════════════
create table if not exists public.deebo_messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid        not null references public.deebo_conversations(id) on delete cascade,
  at              timestamptz not null default now(),
  role            text        not null check (role in ('user', 'assistant')),
  content         text        not null,

  -- للمساعد وحده (تبقى فارغةً في سطر الزائر)
  input_tokens    integer,
  output_tokens   integer,
  cached_tokens   integer,
  latency_ms      integer,

  -- هل حجب حارسُ الأرقام جملةً؟ عمودٌ لا يُستخرج من النصّ بعد فوات الأوان،
  -- ويُقرأ منه: كم مرّةً همّ ديبو أن يخترع رقمًا؟ وهو مقياسُ صحّةٍ لا زينة.
  guard_blocked   boolean     not null default false
);

comment on column public.deebo_messages.guard_blocked is
  'حجب حارسُ الأرقام جملةً في هذا الجواب. مقياسُ ميلِ النموذج إلى الاختراع.';

-- ═══ (٤) الفهارس ═══════════════════════════════════════════════════════════
-- حدُّ الطلبات يسأل: كم رسالةً من هذه البصمة في الساعة الماضية؟
create index if not exists deebo_conv_visitor_idx
  on public.deebo_conversations (visitor_hash, started_at desc);

-- سقفُ الإنفاق يسأل: كم رمزًا استُهلك هذا الشهر؟
create index if not exists deebo_conv_started_idx
  on public.deebo_conversations (started_at desc);

create index if not exists deebo_msg_conv_idx
  on public.deebo_messages (conversation_id, at);

-- غرفةُ الإدارة تسأل: أين همّ ديبو أن يخترع؟ (فهرسٌ جزئيّ: الحالاتُ قليلةٌ نادرة)
create index if not exists deebo_msg_blocked_idx
  on public.deebo_messages (at desc) where guard_blocked;

-- ═══ (٥) الأقفال ═══════════════════════════════════════════════════════════
alter table public.deebo_conversations enable row level security;
alter table public.deebo_messages      enable row level security;

-- لا سياسةَ إدراجٍ ولا تعديلٍ ولا حذفٍ لأحد. الكتابةُ بمفتاح الخدمة وحده
-- (يتجاوز RLS)، فالمتصفّح لا يستطيع أن يكتب صفًّا ولو نادى القاعدة مباشرةً.
drop policy if exists deebo_conv_read on public.deebo_conversations;
create policy deebo_conv_read on public.deebo_conversations
  for select to authenticated
  using (public.check_user_permission(auth.uid(), 'manage_deebo'));

drop policy if exists deebo_msg_read on public.deebo_messages;
create policy deebo_msg_read on public.deebo_messages
  for select to authenticated
  using (public.check_user_permission(auth.uid(), 'manage_deebo'));

-- ═══ (٦) عدّادُ المحادثة ════════════════════════════════════════════════════
-- زيادةٌ **ذرّيّة** لا «اقرأ ثمّ اكتب»: رسالتان تصلان معًا في محادثةٍ واحدة
-- تقرآن العدّاد نفسَه فتكتبان القيمة نفسَها، فتضيع إحداهما. والزيادةُ في SQL
-- تحلّها بلا قفلٍ ولا معاملة.
--
-- وأمّا لماذا دالّةٌ لا `update` من المِنفذ: المِنفذ يكتب بمفتاح الخدمة، والدالّة
-- تُبقي حسابَ الأعمدة في القاعدة موضعًا واحدًا لا يتفرّق بين كاتبين.
create or replace function public.deebo_bump_conversation(
  p_id     uuid,
  p_in     integer,
  p_out    integer,
  p_cached integer
) returns void
language sql
security definer
set search_path = public, pg_temp
as $fn$
  update public.deebo_conversations
     set message_count       = message_count + 1,
         total_input_tokens  = total_input_tokens  + coalesce(p_in, 0),
         total_output_tokens = total_output_tokens + coalesce(p_out, 0),
         total_cached_tokens = total_cached_tokens + coalesce(p_cached, 0),
         last_at             = now()
   where id = p_id;
$fn$;

-- لا ينادِها متصفّح. مفتاحُ الخدمة وحده (وهو يتجاوز المنح أصلًا).
revoke all on function public.deebo_bump_conversation(uuid, integer, integer, integer)
  from public, anon, authenticated;


commit;
