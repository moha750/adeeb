-- قياسُ طُرق الدخول (قرار المالك ٢٠٢٦-١٠-٠٤): تبقى كلمةُ المرور ويُضاف الرمزُ إلى جانبها،
-- ثمّ يُقاس الأثر. وسجلُّ المصادقة في Supabase لا يحفظ إلّا يومًا، ولا يفرّق كلمةَ المرور من الرمز،
-- ولا يرى المحاولةَ الفاشلة. فكلُّ محاولةٍ تُكتب هنا بطريقتها ومكانها ونتيجتها.
--
-- ولا مفتاحَ أجنبيًّا إلى auth.users: هذا قياسٌ لا سجلّ، فلا يعطّل حذفَ حساب.

create table public.signin_events (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  user_id uuid,
  method  text not null check (method in ('password', 'code', 'google', 'apple')),
  outcome text not null check (outcome in ('code_sent', 'success', 'fail', 'reset_requested')),
  place   text not null check (place in ('login', 'booking', 'forgot', 'oauth')),
  detail  text check (detail is null or char_length(detail) <= 80)
);

comment on table public.signin_events is
  'قياسُ طُرق الدخول: كلُّ محاولةٍ بطريقتها (كلمة مرور، رمز، قوقل، أبل) ومكانها ونتيجتها. يكتبه log_signin_event وحده.';

create index signin_events_at_idx on public.signin_events (at);

alter table public.signin_events enable row level security;
revoke all on public.signin_events from anon, authenticated;

-- الكتابةُ من المتصفّح (الفشلُ يقع قبل أيّ جلسة)، فالدالّةُ مفتوحةٌ لـ anon، وصاحبُ الصفّ
-- من auth.uid() لا من معامل. والقيمُ من قوائمَ مغلقة يحرسها القيدُ نفسُه.
create or replace function public.log_signin_event(
  p_method text, p_outcome text, p_place text, p_detail text default null
)
 returns void
 language sql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
  insert into public.signin_events (user_id, method, outcome, place, detail)
  values (auth.uid(), p_method, p_outcome, p_place, left(nullif(btrim(coalesce(p_detail, '')), ''), 80));
$function$;

revoke all on function public.log_signin_event(text, text, text, text) from public;
grant execute on function public.log_signin_event(text, text, text, text) to anon, authenticated, service_role;
