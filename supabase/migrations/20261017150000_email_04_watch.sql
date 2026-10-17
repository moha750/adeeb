-- نظامُ البريد (٤): الحارس (٢٠٢٦-١٠-١٧، اختاره محمد بعد حذف الاحتياط).
--
-- **لا احتياطَ للمُرسِل** (قرار محمد: «يُحذف ولا يبقى منه أثر»)، فإن تعطّل سكت بريدُ الدخول كلُّه. والرسائلُ
-- لا تضيع، تنتظر في الصادر، لكنّ رمزَ الدخول يموت في عشر دقائق. فالعلاجُ أن يُعرَف العطلُ في دقيقتين لا
-- من شكوى عضو: مهمّةٌ كلَّ دقيقةٍ تنظر في الصادر، فإن رأت عطلًا أطلقت إشعارًا **حرِجًا** (الجرسُ وشاشةُ
-- القفل) لمن يملك `manage_website`. **ولا يمرّ الإنذارُ بالبريد**: البريدُ هو المعطّل.
--
-- **العطلُ وجهان:**
--   • **متوقّف** (`stalled`): رسالةٌ في الطابور أكثرَ من دقيقتين. يقع إن سقط الموقع، أو غاب المفتاح
--     (`configured: false`)، أو كان المزوّدُ يردّ ردًّا عابرًا (٤٢٩، ٥xx) فالرسائلُ تدور في مهلها.
--   • **مرفوض** (`rejected`): آخرُ ما انتهى من الرسائل ماتت بردٍّ نهائيّ، ولم تخرج بعدها رسالة. يقع إن
--     أُلغي المفتاح أو رُفض النطاق: كلُّ رسالةٍ تموت لحظتَها فلا يبقى في الطابور ما يُرى. والميّتةُ بأجلها
--     (`expired`) لا تُحسب: لا تموت بأجلها إلّا وقد وقفت قبلُ فرآها الوجهُ الأوّل.
--
-- **إنذارٌ واحدٌ للعطل الواحد، وخبرٌ واحدٌ بعودته.** حالُ العطل لا تحتاج جدولًا: آخرُ واقعتَي الحارس في
-- `notification_events` هي الحال. فإن كانت «متوقّف» والحالُ سليمة أُطلقت «عاد»، والعكسُ بالعكس.

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
  -- الطابور: كم ينتظر، ومنذ متى، وفيه رمزُ دخول؟ وآخرُ خطأٍ كتبه المُرسِل على واحدةٍ منها.
  select count(*)::integer,
         (count(*) filter (where kind like 'auth.%'))::integer,
         min(created_at),
         (array_agg(last_error order by created_at desc) filter (where last_error is not null))[1]
    into v_pending, v_auth, v_oldest, v_err
    from email_outbox
   where status in ('queued', 'sending');

  -- آخرُ ميّتةٍ بردٍّ نهائيّ، وآخرُ ما خرج.
  select created_at, last_error, kind
    into v_dead_at, v_dead_err, v_dead_kind
    from email_outbox
   where status = 'dead' and coalesce(last_error, '') not like '%expired'
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

comment on function public.email_watch() is
  'حارسُ البريد: كلَّ دقيقة، إن وقف الصادرُ أو رُفض أطلق system.email_down، وإن عاد أطلق system.email_restored. v2/EMAIL-SYSTEM.md';

-- للمهمّة المجدولة وحدها (وُلدت مغلقة).
revoke all on function public.email_watch() from public, anon, authenticated;

-- حالُ العطل تُقرأ كلَّ دقيقة: فهرسٌ جزئيٌّ صغيرٌ مهما كبر سجلُّ الوقائع.
create index if not exists notification_events_email_watch_idx
  on public.notification_events (id)
  where kind in ('system.email_down', 'system.email_restored');

select cron.unschedule('email-watch') where exists (select 1 from cron.job where jobname = 'email-watch');
select cron.schedule('email-watch', '* * * * *', $job$ select public.email_watch(); $job$);
