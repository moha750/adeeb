-- ═══════════════════════════════════════════════════════════════════════════
-- اشتراكاتُ إشعارات الجهاز — «أدِيب» تطبيقًا على الجوّال (٢٠٢٦-١٠-٠٣)
--
-- كلُّ صفٍّ جهازٌ واحدٌ (متصفّحٌ أو تطبيقٌ مثبَّت) قَبِل صاحبُه أن تصله إشعاراتُ أدِيب.
-- والعنوانُ (`endpoint`) فريدٌ على الجدول كلِّه لا للمستخدم: الجهازُ الواحد يحمل اشتراكًا
-- واحدًا، فإن دخله حسابٌ آخر انتقل الصفُّ إليه ولم يبقَ لصاحبه الأوّل باب.
--
-- **والإشعارُ يتبع الجلسة لا الحساب وحده** (`session_id`): من خرج من الجهاز لا يصله بعدها
-- ما يخصّه. والإبطالُ حذفُ صفٍّ في `auth.sessions` (انظر `20260924170000_session_alive`)،
-- فيُكنَس الاشتراكُ الذي ماتت جلستُه عند أوّل إرسالٍ إليه في `push_targets` أدناه.
--
-- ولا سياسةَ لأحد: الجدولُ يُقرأ ويُكتب من الخادم بمفتاح الخدمة وحده (`app/_pwa/actions.ts`
-- و`lib/push/send.ts`)، فالمفتاحان (`p256dh`/`auth`) لا يبلغان متصفّحًا غيرَ الذي ولّدهما.
-- (وجدولٌ بالاسم نفسِه وُلد ٢٠٢٦-٠١-٣٠ للنسخة الأولى ثمّ سقط معها؛ هذا وليدٌ جديد لا إحياء.)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  id              bigint generated always as identity primary key,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  session_id      uuid,
  endpoint        text        not null unique,
  p256dh          text        not null,
  auth            text        not null,
  user_agent      text,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  last_success_at timestamptz,
  constraint push_subscriptions_endpoint_https check (endpoint like 'https://%'),
  constraint push_subscriptions_keys_len check (length(p256dh) between 80 and 100 and length(auth) between 16 and 32)
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

comment on table public.push_subscriptions is
  'أجهزةٌ قَبِلت إشعاراتِ أدِيب (Web Push). لمفتاح الخدمة وحده؛ والصفُّ يتبع الجلسة التي اشترك منها.';

-- ─── أهدافُ الإرسال: الأحياءُ فقط، والموتى يُكنَسون في الطريق ────────────────
create or replace function public.push_targets(p_users uuid[])
returns table (id bigint, user_id uuid, endpoint text, p256dh text, auth text)
language plpgsql
volatile
security definer
set search_path to 'auth', 'public'
as $function$
#variable_conflict use_column
begin
  -- جلسةٌ حُذفت أو انقضى صندوقُ وقتها = صاحبُها خرج من الجهاز. والشرطُ عينُ `session_alive`.
  delete from public.push_subscriptions ps
  where ps.user_id = any (p_users)
    and ps.session_id is not null
    and not exists (
      select 1 from auth.sessions s
      where s.id = ps.session_id
        and s.user_id = ps.user_id
        and (s.not_after is null or s.not_after > now())
    );

  return query
    select ps.id, ps.user_id, ps.endpoint, ps.p256dh, ps.auth
    from public.push_subscriptions ps
    where ps.user_id = any (p_users);
end;
$function$;

-- **المنحُ يُنزَع أوّلًا** كأخواتها: بوستجرس يمنح `execute` لـ`public` عند الإنشاء.
revoke all on function public.push_targets(uuid[]) from public, anon, authenticated;
grant execute on function public.push_targets(uuid[]) to service_role;

comment on function public.push_targets(uuid[]) is
  'اشتراكاتُ هؤلاء الأحياءُ للإرسال، بعد كنس من ماتت جلستُه. لمفتاح الخدمة وحده (lib/push/send.ts).';
