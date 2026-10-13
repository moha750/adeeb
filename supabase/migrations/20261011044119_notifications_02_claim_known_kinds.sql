-- نظامُ الإشعارات (٢): الموزِّعُ لا يطالب إلّا بما يعرفه دليلُه، والفشلُ يُمهَل لا يُعاد فورًا.
-- (من المراجعة المستقلّة للمحرّك 2026-10-10، ووافق محمد 2026-10-11)
--
-- كانت المطالبةُ تأخذ كلَّ واقعةٍ في الطابور، فإن لم يعرف الموزِّعُ نوعَها أوقفها للأبد. وترتيبُ النشر
-- عندنا يجعل هذا يقع: الترحيلُ يُطبَّق قبل نشر الكود، فدالّةُ قاعدةٍ تُطلق نوعًا جديدًا (`notify_event`)
-- قبل أن يصل مدخلُه إلى الدليل المنشور، فيطالب بها موزِّعٌ قديمٌ فيقتلها صامتًا.
--
-- والآن يُمرّر الموزِّعُ مفاتيحَ دليله (`p_kinds`)، فما لا يعرفه يبقى في الطابور كما هو حتّى يُنشَر
-- كودٌ يعرفه، لا يُستهلَك منه شيء. والإمهالُ في الكود: الواقعةُ الفاشلة تبقى مُطالَبةً (`claimed_at`)
-- فلا تُعاد قبل انقضاء الخمس دقائق، فعطلٌ عابرٌ لا يأكل المحاولاتِ الخمسَ في ثوانٍ.
--
-- ## والشكلُ القديم (`p_limit` وحده) يُعطَّل ولا يُزال
-- أداةُ Supabase في جلسات الوكيل تحبس كلَّ عبارةٍ هادمة بانتظار تأكيدٍ لا يصل ثمّ تُلغيها (وقع مرّتين
-- اليوم بعد موافقة محمد). فبقي الشكلُ القديم بجسدٍ لا يطالب بشيء، ومنزوعَ التنفيذ حتّى عن مفتاح
-- الخدمة: لا يناديه أحد، ولو ناداه كودٌ قديمٌ لم يأخذ شيئًا. وإزالتُه نهائيًّا سطرٌ في محرّر SQL متى شاء.

-- ══ (١) المطالبةُ بأنواع الدليل ═════════════════════════════════════════════════════════════════

create or replace function public.claim_notification_events(p_kinds text[], p_limit integer default 20)
returns setof public.notification_events
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.notification_events e
     set claimed_at = now(),
         attempts   = e.attempts + 1
   where e.id in (
     select q.id
       from public.notification_events q
      where q.dispatched_at is null
        and q.kind = any(coalesce(p_kinds, '{}'::text[]))
        and q.attempts < 5
        and (q.claimed_at is null or q.claimed_at < now() - interval '5 minutes')
      order by q.id
      limit greatest(1, least(coalesce(p_limit, 20), 100))
      for update skip locked
   )
  returning e.*;
$$;

comment on function public.claim_notification_events(text[], integer) is
  'مطالبةُ الموزِّع: دفعةٌ ذرّيّةٌ من الوقائع التي يعرف دليلُه أنواعَها. ما لا يعرفه يبقى في الطابور حتّى يُنشَر مدخلُه.';

revoke execute on function public.claim_notification_events(text[], integer) from public, anon, authenticated;
grant  execute on function public.claim_notification_events(text[], integer) to service_role;

-- ══ (٢) الشكلُ القديم: مُعطَّل ═══════════════════════════════════════════════════════════════════

create or replace function public.claim_notification_events(p_limit integer default 20)
returns setof public.notification_events
language sql
security definer
set search_path = public, pg_temp
as $$
  select * from public.notification_events where false;
$$;

comment on function public.claim_notification_events(integer) is
  'مُعطَّل (2026-10-11): حلّ محلَّه claim_notification_events(text[], integer). لا يطالب بشيء ولا يُنفَّذ.';

revoke execute on function public.claim_notification_events(integer) from public, anon, authenticated, service_role;
