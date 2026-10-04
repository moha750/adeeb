-- عودةُ المتطوّع فصلٌ يُضاف لا فصلٌ يُمحى (٢٠٢٦-٠٩-٢٩)
--
-- كانت `apply_for_volunteering` تنتهي بـ:
--     on conflict (user_id) do update set status='active', ended_at=null, ended_by=null, end_reason=null;
-- فالمتطوّعُ السابقُ يعود بنفسه من نموذج التطوّع، **ويُمحى في اللحظة** سببُ انتهائه
-- وتاريخُه ومن أنهاه. فمن خرجت بسبب «انضمت إلى نادي آخر» تعود فتبدو كأنّها لم تخرج قطّ،
-- ويفقد المسؤولُ خبرًا لا يُعوَّض: **من عاد بعد انقطاع**.
--
-- والعلاجُ هنا لا في التطبيق: الدالّةُ نفسُها تحفظ الفصلَ السابق وتختم فصلًا جديدًا.
--   · `ended_at`/`ended_by`/`end_reason` تبقى **خبرَ الانقطاع الأخير** (والصفُّ نشطٌ فوقها).
--   · `returned_at` عمودٌ جديد يقول متى عاد. فالسجلُّ يُقرأ: تطوّع · انقطع بسبب كذا · عاد.
--   · و`applied_at` يبقى أوّلَ يومٍ تطوّع فيه كما كان (لا يُعاد ختمُه)، فالأقدميّةُ محفوظة.
--
-- ولا يُمحى شيءٌ من الماضي: الأربعةُ السابقون اليوم بلا `returned_at` — لم يعودوا بعد.

begin;

alter table public.volunteers
  add column if not exists returned_at timestamptz;

comment on column public.volunteers.returned_at is
  'تاريخُ عودة متطوّعٍ سابقٍ إلى التطوّع. وحقولُ الانتهاء تبقى خبرَ الانقطاع الأخير، فالعودةُ تُضاف ولا تمحو.';

comment on column public.volunteers.ended_at is
  'نهايةُ آخرِ فترة تطوّع. تبقى بعد العودة (مع `returned_at`) فيُقرأ الانقطاعُ من السجلّ.';

create or replace function public.apply_for_volunteering(p_prefs integer[])
returns void
language plpgsql security definer set search_path = 'public', 'pg_temp'
as $function$
declare
  v_user uuid := auth.uid();
  v_need integer;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from profiles where id = v_user) then raise exception 'NO_PROFILE'; end if;
  -- العضوُ فوق هذه المحطّة لا دونها
  if is_adeeb_member(v_user) then raise exception 'ALREADY_MEMBER'; end if;
  if exists (select 1 from volunteers where user_id = v_user and status = 'active') then
    raise exception 'ALREADY_VOLUNTEER';
  end if;

  -- العودةُ تختم `returned_at` وتُبقي خبرَ الانقطاع كما هو (كان يُمحى ههنا)
  insert into volunteers (user_id, status, applied_at)
  values (v_user, 'active', now())
  on conflict (user_id) do update
    set status = 'active',
        returned_at = now();

  select least(3, count(*)) into v_need from volunteer_committee_options();
  if p_prefs is null or array_length(p_prefs, 1) is distinct from v_need then
    raise exception 'PREFS_COUNT';
  end if;
  if (select count(distinct x) from unnest(p_prefs) x) <> v_need then raise exception 'PREFS_DUPLICATE'; end if;
  if exists (
    select 1 from unnest(p_prefs) x
    where x not in (select o.id from volunteer_committee_options() o)
  ) then raise exception 'PREFS_INVALID'; end if;

  delete from volunteer_preferences where user_id = v_user;
  insert into volunteer_preferences (user_id, rank, committee_id)
  select v_user, ord::smallint, x from unnest(p_prefs) with ordinality as t(x, ord);

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_user, 'volunteer_apply', 'profile', v_user::text,
          jsonb_build_object('preferences', p_prefs));
end;
$function$;

commit;
