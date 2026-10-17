-- نظامُ البريد (١): الصادر (٢٠٢٦-١٠-١٧، اعتمده محمد: «نظامٌ قويٌّ صلبٌ مستدام، ولو من الصفر»).
--
-- كلُّ رسالةٍ يرسلها أدِيب، أيًّا كان مصدرُها، **صفٌّ هنا أوّلًا**: نوعُها، ولمن، وحقائقُها. ثمّ يأخذها
-- مُرسِلٌ واحد (`/api/email/drain` في الموقع، `lib/email/`) فيرسمها بقالبها ويرسلها، ويكتب هنا ما جرى.
-- فالجدولُ طابورٌ وسجلٌّ معًا: لا رسالةَ خرجت أو سقطت إلّا وأثرُها فيه. التصميم: v2/EMAIL-SYSTEM.md.
--
-- **الحالات**: queued (تنتظر) ← sending (أخذها المُرسِل) ← sent، أو تعود queued بمهلةٍ متباعدة إن سقطت
-- سقوطًا عابرًا، أو dead إن ردّها المزوّدُ ردًّا نهائيًّا أو نفدت محاولاتُها أو فات أجلُها. و`cancelled`
-- لما أُلغي بيد.
--
-- **ولا يُكتب فيه من المتصفّح ولا يُقرأ**: مفتاحُ الخدمة وحده (سجلُّه يُعرَض في اللوحة من الخادم).

create table public.email_outbox (
  id              bigint generated always as identity primary key,
  -- «قسمٌ.نوع» كمفاتيح الإشعارات: مفتاحُ القالب في `lib/email/kinds.ts`.
  kind            text        not null,
  to_email        text        not null,
  to_user         uuid        references auth.users(id) on delete set null,
  -- حقائقُ الرسالة: يرسم منها القالبُ نصَّه ساعةَ الإرسال.
  data            jsonb       not null default '{}'::jsonb,
  -- مفتاحُ التكرار: رسالةٌ واحدةٌ لواقعةٍ واحدة ولو طُلبت مرّتين (ويُمرَّر إلى المزوّد أيضًا).
  dedupe_key      text        unique,
  status          text        not null default 'queued',
  attempts        smallint    not null default 0,
  next_attempt_at timestamptz not null default now(),
  claimed_at      timestamptz,
  -- أجلٌ لا تُرسَل بعده: رمزُ الدخول يموت في دقائقه، والإشعارُ يكذب بعد يومين.
  expires_at      timestamptz,
  subject         text,
  provider        text,
  provider_id     text,
  last_error      text,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,
  constraint email_outbox_kind_shape check (kind ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  constraint email_outbox_status check (status in ('queued', 'sending', 'sent', 'dead', 'cancelled')),
  constraint email_outbox_to_shape check (to_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint email_outbox_data_object check (jsonb_typeof(data) = 'object')
);

comment on table public.email_outbox is
  'صادرُ البريد: طابورٌ وسجلٌّ لكلّ رسالةٍ يرسلها أدِيب. يكتبه enqueue_email ويستنزفه /api/email/drain. v2/EMAIL-SYSTEM.md';

-- الطابور: ما يحين إرسالُه. والفهرسُ جزئيٌّ فيبقى صغيرًا مهما كبر السجلّ.
create index email_outbox_due_idx  on public.email_outbox (next_attempt_at) where status in ('queued', 'sending');
create index email_outbox_user_idx on public.email_outbox (to_user, created_at desc) where to_user is not null;
create index email_outbox_time_idx on public.email_outbox (created_at desc);

alter table public.email_outbox enable row level security;
-- لا سياسات: لا يبلغه `anon` ولا `authenticated`. مفتاحُ الخدمة يتجاوز RLS.
revoke all on table public.email_outbox from anon, authenticated;

-- ══ الإدراج ═══════════════════════════════════════════════════════════════════
-- البابُ الواحد إلى الصادر: من دالّة قاعدةٍ (فتنجح الرسالةُ وحدثُها معًا أو يسقطان معًا) أو من الخادم.
-- ومفتاحُ تكرارٍ موجودٌ = لا شيء يُضاف، ويرجع معرّفُ الصفّ القائم.
create or replace function public.enqueue_email(
  p_kind    text,
  p_to      text,
  p_user    uuid  default null,
  p_data    jsonb default '{}'::jsonb,
  p_dedupe  text  default null,
  p_expires timestamptz default null
) returns bigint
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_id bigint;
begin
  insert into email_outbox (kind, to_email, to_user, data, dedupe_key, expires_at)
  values (p_kind, lower(btrim(p_to)), p_user, coalesce(p_data, '{}'::jsonb), p_dedupe, p_expires)
  on conflict (dedupe_key) do nothing
  returning id into v_id;

  if v_id is null and p_dedupe is not null then
    select id into v_id from email_outbox where dedupe_key = p_dedupe;
  end if;
  return v_id;
end;
$$;

-- ══ المطالبة ══════════════════════════════════════════════════════════════════
-- ذرّيّة (`skip locked`): مُرسِلان متزامنان لا يأخذان الرسالةَ نفسَها. وما بقي `sending` أكثرَ من خمس
-- دقائق مات مُرسِلُه في منتصفه، فيُطالَب من جديد. وما فات أجلُه يموت هنا قبل أن يُطالَب.
create or replace function public.claim_emails(p_limit integer default 20)
returns setof public.email_outbox
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  update email_outbox
     set status = 'dead', last_error = coalesce(last_error || ' ؛ ', '') || 'expired', claimed_at = null
   where status in ('queued', 'sending')
     and expires_at is not null and expires_at <= now();

  return query
  update email_outbox e
     set status = 'sending', claimed_at = now(), attempts = e.attempts + 1
   where e.id in (
     select q.id from email_outbox q
      where (q.status = 'queued' and q.next_attempt_at <= now())
         or (q.status = 'sending' and q.claimed_at < now() - interval '5 minutes')
      order by q.next_attempt_at, q.id
      limit greatest(1, least(coalesce(p_limit, 20), 100))
      for update skip locked)
  returning e.*;
end;
$$;

-- ══ الختم ═════════════════════════════════════════════════════════════════════
-- `sent`: يُحفظ المعرّفُ عند المزوّد. وحقائقُ رسائل المصادقة تُمحى بعد إرسالها (فيها رمزُ الدخول):
-- السجلُّ يقول «خرجت»، ولا يحتفظ بما لا حاجة إليه.
create or replace function public.mark_email_sent(p_id bigint, p_subject text, p_provider text, p_provider_id text)
returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  update email_outbox
     set status = 'sent', sent_at = now(), subject = p_subject, provider = p_provider,
         provider_id = p_provider_id, last_error = null, claimed_at = null,
         data = case when kind like 'auth.%' then '{}'::jsonb else data end
   where id = p_id;
$$;

-- السقوط: العابرُ يعود إلى الطابور بمهلةٍ متباعدة (دقيقة، خمس، ربع ساعة، ساعة، ثلاث ساعات)، والنهائيُّ
-- أو السادسُ يموت. والمهلةُ في القاعدة لا في الكود، فلا يختلف فيها مُرسِلان.
create or replace function public.mark_email_failed(p_id bigint, p_error text, p_retryable boolean, p_subject text default null)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_attempts smallint;
  v_status   text;
begin
  select attempts into v_attempts from email_outbox where id = p_id;
  v_status := case when p_retryable and coalesce(v_attempts, 99) < 6 then 'queued' else 'dead' end;
  update email_outbox
     set status = v_status,
         last_error = left(p_error, 500),
         subject = coalesce(p_subject, subject),
         claimed_at = null,
         next_attempt_at = now() + case coalesce(v_attempts, 1)
                                     when 1 then interval '1 minute'
                                     when 2 then interval '5 minutes'
                                     when 3 then interval '15 minutes'
                                     when 4 then interval '1 hour'
                                     else interval '3 hours' end
   where id = p_id;
  return v_status;
end;
$$;

-- إعادةُ رسالةٍ ماتت إلى الطابور (زرُّ «أعِد الإرسال» في السجلّ). لا تُعاد رسالةُ مصادقة: رمزُها مات معها.
create or replace function public.retry_email(p_id bigint)
returns boolean
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  with r as (
    update email_outbox
       set status = 'queued', attempts = 0, next_attempt_at = now(), claimed_at = null,
           expires_at = case when expires_at is not null and expires_at <= now() then null else expires_at end
     where id = p_id and status = 'dead' and kind not like 'auth.%'
    returning 1)
  select exists (select 1 from r);
$$;

-- كلُّها للخادم وحده (وُلدت مغلقةً، §الأمن ٢٠٢٦-١٠-١٠)، ويُصرَّح بذلك هنا كي لا يُفتَح شيءٌ سهوًا.
revoke all on function public.enqueue_email(text, text, uuid, jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_emails(integer) from public, anon, authenticated;
revoke all on function public.mark_email_sent(bigint, text, text, text) from public, anon, authenticated;
revoke all on function public.mark_email_failed(bigint, text, boolean, text) from public, anon, authenticated;
revoke all on function public.retry_email(bigint) from public, anon, authenticated;

-- ══ النداء ════════════════════════════════════════════════════════════════════
-- كلُّ إدراجٍ يطرق المُرسِلَ فورًا (`pg_net` لا ينتظر، ولا يخرج نداؤه إن سقطت المعاملة)، فرمزُ الدخول
-- يصل في ثوانٍ. والمهمّةُ المجدولة أدناه شبكةُ أمانٍ لما فات: إعادةُ المحاولات، وطَرقةٌ ضاعت.
create or replace function public._poke_email_drain()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_secret text;
begin
  select s.decrypted_secret into v_secret from vault.decrypted_secrets s where s.name = 'email_drain_secret' limit 1;
  if v_secret is null then return; end if;
  perform net.http_post(
    url := 'https://adeeb.club/api/email/drain',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000);
end;
$$;
revoke all on function public._poke_email_drain() from public, anon, authenticated;

create or replace function public._email_outbox_poke()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  perform _poke_email_drain();
  return null;
end;
$$;

create trigger email_outbox_poke
  after insert on public.email_outbox
  for each statement execute function public._email_outbox_poke();

select cron.unschedule('email-drain') where exists (select 1 from cron.job where jobname = 'email-drain');
select cron.schedule('email-drain', '* * * * *', $job$
  select public._poke_email_drain()
   where exists (select 1 from public.email_outbox q
                  where (q.status = 'queued' and q.next_attempt_at <= now())
                     or (q.status = 'sending' and q.claimed_at < now() - interval '5 minutes'));
$job$);

-- السجلُّ لا يكبر بلا حدّ: سنةٌ ثمّ يُمحى (ورسائلُ المصادقة شهرًا: لا يُرجَع إليها).
select cron.unschedule('email-outbox-purge') where exists (select 1 from cron.job where jobname = 'email-outbox-purge');
select cron.schedule('email-outbox-purge', '40 3 * * *', $job$
  delete from public.email_outbox
   where (kind like 'auth.%' and created_at < now() - interval '30 days')
      or created_at < now() - interval '365 days';
$job$);

-- ══ ما سبقه ═══════════════════════════════════════════════════════════════════
-- عمودا البريد في صندوق الإشعارات (أُضيفا صباحَ اليوم نفسِه في `notifications_03`) يسقطان: سجلُّ البريد
-- هو الصادرُ نفسُه، ولا يُحفظ أثرُ الرسالة في موضعين (قرار محمد: لا عمودَ بلا عمل).
alter table public.notification_inbox
  drop column if exists emailed_at,
  drop column if exists email_error;
