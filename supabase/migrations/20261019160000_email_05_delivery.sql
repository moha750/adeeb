-- نظامُ البريد (٥): ما بعد الخروج (٢٠٢٦-١٠-١٩، طلبه محمد: «نعم» لإضافة الارتداد إلى سجلّ البريد).
--
-- **«خرجت» كانت تعني أنّ Resend قبلها فقط.** ثمّ يحاول تسليمَها إلى خادم المستلم، فإمّا وصلت، وإمّا تأخّرت
-- (صندوقٌ ممتلئ، خادمٌ مشغول)، وإمّا ارتدّت (عنوانٌ غيرُ موجود)، وإمّا وصلت فعدّها صاحبُها رسالةً مزعجة. هذا
-- كلُّه يخبرنا به Resend بخطّاف (`/api/email/webhook`)، فيُكتب هنا على صفّ الرسالة نفسِه.
--
-- **والعنوانُ الذي ارتدّ ارتدادًا دائمًا أو شكا يُوقَف** (`email_suppressions`): لا يُراسَل بعدها حتى يُرفع إيقافُه
-- من سجلّ البريد. لأنّ تكرار الإرسال إلى عناوين مرتدّةٍ يجعل Gmail يشكّ في بريد أدِيب كلّه. والارتدادُ العابر
-- (`Transient`) لا يُوقِف: صندوقٌ ممتلئٌ اليومَ يفرغ غدًا.

-- ══ حالُ التسليم على صفّ الرسالة ══════════════════════════════════════════════
alter table public.email_outbox
  add column if not exists delivery      text,
  add column if not exists delivery_at   timestamptz,
  add column if not exists delivery_note text;

alter table public.email_outbox drop constraint if exists email_outbox_delivery;
alter table public.email_outbox add constraint email_outbox_delivery
  check (delivery is null or delivery in ('delivered', 'delayed', 'bounced', 'complained'));

-- الخطّافُ يجد الرسالةَ بمعرّفها عند المزوّد.
create index if not exists email_outbox_provider_idx on public.email_outbox (provider_id) where provider_id is not null;

-- ══ العناوينُ الموقوفة ═════════════════════════════════════════════════════════
create table if not exists public.email_suppressions (
  email      text        primary key,
  reason     text        not null,
  note       text,
  outbox_id  bigint      references public.email_outbox(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint email_suppressions_reason check (reason in ('bounced', 'complained')),
  constraint email_suppressions_lower check (email = lower(email))
);

comment on table public.email_suppressions is
  'عناوينُ لا يُراسَلها أدِيب: ارتدّت ارتدادًا دائمًا أو شكا أصحابُها. يكتبها email_delivery_event ويرفعها unsuppress_email. v2/EMAIL-SYSTEM.md';

alter table public.email_suppressions enable row level security;
-- لا سياسات: مفتاحُ الخدمة وحده، كالصادر.
revoke all on table public.email_suppressions from anon, authenticated;

-- ══ واقعةُ التسليم ═════════════════════════════════════════════════════════════
-- يناديها الخطّافُ بعد أن يتحقّق من توقيع Resend. وترتيبُ الوقائع قد يختلط في الطريق، فالحكمُ بالأشدّ:
-- الارتدادُ والشكوى لا يمحوهما شيء، والوصولُ يمحو التأخّر، والتأخّرُ لا يمحو الوصول.
create or replace function public.email_delivery_event(
  p_provider_id text,
  p_type        text,
  p_note        text    default null,
  p_permanent   boolean default true
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_id    bigint;
  v_to    text;
  v_rank  int := case p_type when 'delayed' then 1 when 'delivered' then 2 when 'bounced' then 3 when 'complained' then 3 end;
begin
  if v_rank is null then
    raise exception 'نوعُ واقعةٍ لا يُعرف: %', p_type;
  end if;

  update email_outbox
     set delivery = p_type, delivery_at = now(), delivery_note = left(p_note, 500)
   where provider_id = p_provider_id
     and (delivery is null or v_rank > case delivery when 'delayed' then 1 when 'delivered' then 2 else 3 end)
  returning id, lower(to_email) into v_id, v_to;

  if v_id is null then
    return exists (select 1 from email_outbox where provider_id = p_provider_id);
  end if;

  if p_type = 'complained' or (p_type = 'bounced' and p_permanent) then
    insert into email_suppressions (email, reason, note, outbox_id)
    values (v_to, p_type, left(p_note, 500), v_id)
    on conflict (email) do update set reason = excluded.reason, note = excluded.note,
                                      outbox_id = excluded.outbox_id, created_at = now();
  end if;
  return true;
end;
$$;

comment on function public.email_delivery_event(text, text, text, boolean) is
  'واقعةُ تسليمٍ من Resend على صفّ رسالتها، ويُوقَف العنوانُ إن ارتدّ ارتدادًا دائمًا أو شكا. للخادم وحده.';

-- رفعُ الإيقاف: زرٌّ في سجلّ البريد بعد أن يُصحَّح العنوانُ أو يُفرَّغ الصندوق.
create or replace function public.unsuppress_email(p_email text)
returns boolean
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  with d as (delete from email_suppressions where email = lower(trim(p_email)) returning 1)
  select exists (select 1 from d);
$$;

-- للخادم وحده (وُلدت مغلقةً، §الأمن ٢٠٢٦-١٠-١٠).
revoke all on function public.email_delivery_event(text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.unsuppress_email(text) from public, anon, authenticated;

-- ══ الحارس: الموقوفُ ليس عطلًا ══════════════════════════════════════════════════
-- رسالةٌ إلى عنوانٍ موقوفٍ تموت بسببها (`suppressed`) لا بردّ المزوّد، فلا يُحسب موتُها «رفضًا» يُطلق الإنذار.
-- الدالّةُ كما في email_04_watch حرفًا بحرف، إلّا شرطَ الميّتة الأخيرة.
create or replace function public.email_watch()
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_pending   integer;
  v_auth      integer;
  v_oldest    timestamptz;
  v_err       text;
  v_dead_at   timestamptz;
  v_dead_err  text;
  v_dead_kind text;
  v_sent_at   timestamptz;
  v_reason    text;
  v_last      record;
begin
  select count(*)::integer,
         (count(*) filter (where kind like 'auth.%'))::integer,
         min(created_at),
         (array_agg(last_error order by created_at desc) filter (where last_error is not null))[1]
    into v_pending, v_auth, v_oldest, v_err
    from email_outbox
   where status in ('queued', 'sending');

  select created_at, last_error, kind
    into v_dead_at, v_dead_err, v_dead_kind
    from email_outbox
   where status = 'dead'
     and coalesce(last_error, '') not like '%expired'
     and coalesce(last_error, '') not like 'suppressed%'
   order by created_at desc
   limit 1;
  select max(sent_at) into v_sent_at from email_outbox where status = 'sent';

  v_reason := case
    when v_oldest < now() - interval '2 minutes' then 'stalled'
    when v_dead_at is not null and (v_sent_at is null or v_sent_at < v_dead_at) then 'rejected'
  end;

  select id, kind, created_at into v_last
    from notification_events
   where kind in ('system.email_down', 'system.email_restored')
   order by id desc
   limit 1;

  if v_reason is not null and v_last.kind is distinct from 'system.email_down' then
    perform notify_event('system.email_down', jsonb_build_object(
      'reason',  v_reason,
      'pending', v_pending,
      'auth',    case when v_reason = 'stalled' then v_auth > 0 else v_dead_kind like 'auth.%' end,
      'error',   left(case when v_reason = 'stalled' then v_err else v_dead_err end, 200)));
    return 'down';
  elsif v_reason is null and v_last.kind = 'system.email_down' then
    perform notify_event('system.email_restored', jsonb_build_object('since', v_last.created_at));
    return 'restored';
  end if;

  return coalesce(v_reason, 'ok');
end;
$$;

revoke all on function public.email_watch() from public, anon, authenticated;
