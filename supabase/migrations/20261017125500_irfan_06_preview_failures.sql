-- ═══════════════════════════════════════════════════════════════════════════
-- «عِرفان» ٦ (٢٠٢٦-١٠-١٧) — **سجلُّ ما سقط من صور المعاينة**.
--
-- صورةُ المعاينة (التي يعرضها واتساب فوق الرابط) يرسمها متصفّحُ المرسل ويرفعها، لأنّ الرسمَ على الخادم
-- يتعثّر في وصل العربيّة. وفي يومها الأوّل سقطت صورتان في الآيفون فعرض واتساب شعارَ الموقع بدل البطاقة،
-- وكان السببُ تشخيصًا من الأثر لا يقينًا (ذاكرةُ ألواح الرسم في سفاري). فطلب المالكُ حلًّا «مستدامًا لا
-- يسقط»، ومنه هذا السجلّ: كلُّ تجهيزٍ سقط بعد محاولاته يُكتب هنا بخطوته وخطئه وجهازه، فإن عاد يُعرف سببُه.
--
-- يكتبه الخادمُ وحده بمفتاح الخدمة (`irfanPreviewFailed`)، بعد أن يتحقّق أنّ الرسالة رسالةُ صاحب الجلسة.
-- ولا يقرؤه المتصفّح: لا سياسةَ فيه لأحد.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.irfan_preview_failures (
  id          bigint generated always as identity primary key,
  message_id  bigint not null references public.irfan_messages(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  -- أين سقط: الرسمُ في المتصفّح أم الرفعُ إلى التخزين، ومن أين: شاشةُ الكتابة أم ترميمُ الغرفة
  step        text not null check (step in ('render', 'upload')),
  origin      text not null check (origin in ('compose', 'room')),
  error       text check (error is null or char_length(error) <= 500),
  user_agent  text check (user_agent is null or char_length(user_agent) <= 400),
  created_at  timestamptz not null default now()
);
create index irfan_preview_failures_at on public.irfan_preview_failures (created_at desc);
comment on table public.irfan_preview_failures is
  'صورُ معاينة «عِرفان» التي سقط تجهيزُها بعد محاولاته: الخطوةُ والخطأ والجهاز. يكتبه الخادمُ وحده.';

alter table public.irfan_preview_failures enable row level security;
revoke all on public.irfan_preview_failures from anon, authenticated;
