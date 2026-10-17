-- نظامُ الإشعارات (٤): منفذُ الاستنزاف يُنادى كلَّ دقيقة (٢٠٢٦-١٠-١٧، بإذن محمد بتثبيت pg_net).
--
-- الوقائعُ التي تولد بلا طلبٍ يوزّعها (انتهاءُ التكليف بأجله في `sweep_acting_assignments`، وإعلانُ
-- فائز الانتخاب من كنّاسه) لا ينتظرها `kickDispatch`. فتنادي هذه المهمّةُ `/api/notifications/drain`
-- كلَّ دقيقة — **إن كان في الطابور ما ينتظر**، فلا يُطرَق المنفذُ ١٤٤٠ مرّةً في يومٍ لا شيءَ فيه.
-- والشرطُ توأمُ ما تطالب به `claim_notification_events`، ومحدودٌ بيومٍ: واقعةٌ من نوعٍ لم يُنشَر دليلُه
-- لا تُطالَب أبدًا، فلا تُبقي المنفذَ مطروقًا كلَّ دقيقةٍ بلا نهاية.
--
-- **والسرُّ لا يُكتب هنا**: يُقرأ من Vault (`notifications_drain_secret`)، وقيمتُه
-- `HMAC-SHA256(SUPABASE_SERVICE_ROLE_KEY, 'adeeb-notifications-drain')` تُكتب في Vault خارج المستودع
-- (`select vault.create_secret('<hex>', 'notifications_drain_secret')`). وبلا سرٍّ يُردّ النداءُ ٤٠١ ولا يضرّ.

create extension if not exists pg_net with schema extensions;

select cron.unschedule('notifications-drain')
where exists (select 1 from cron.job where jobname = 'notifications-drain');

select cron.schedule(
  'notifications-drain',
  '* * * * *',
  $job$
  select net.http_post(
    url := 'https://adeeb.club/api/notifications/drain',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select s.decrypted_secret from vault.decrypted_secrets s
                         where s.name = 'notifications_drain_secret' limit 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000)
  where exists (
    select 1 from public.notification_events q
     where q.dispatched_at is null
       and q.attempts < 5
       and q.created_at > now() - interval '1 day'
       and (q.claimed_at is null or q.claimed_at < now() - interval '5 minutes'));
  $job$
);
