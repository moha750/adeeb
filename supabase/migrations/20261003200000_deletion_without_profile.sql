-- حذفُ الحساب لمن لا ملفّ له (قرار المالك ٢٠٢٦-١٠-٠٣)
--
-- الحسابُ يولد بلا صفٍّ في profiles، والملفُّ يُطلب عند أوّل حاجة. وكان بابُ الحذف يقرأ
-- profiles وحدَها، فمن لم يكمل ملفَّه — ٥٥ حسابًا يومَها، منهم ٢٩ لاعبًا في «دربك خضر» — يُردّ
-- بـ«لا سجلَّ لحسابك»: حسابٌ يملكه صاحبُه ولا يملك أن يحذفه.
--
-- والحكمُ نفسُه بلا استثناء: مهلةُ ثلاثين يومًا، ثمّ يمحوه الكنّاس. ولا أرشيفَ يُحفظ لأنّه لا
-- ملفَّ له ولا عضويّة. ويُكتب الطلبُ في جدولٍ صغيرٍ لأنّ لا صفَّ له في profiles يحمله.
--
-- **نفّذه المالكُ بيده في محرّر SQL** (أداةُ Supabase في جلسة الوكيل تحبس كلَّ أمرٍ فيه حذف)،
-- فصفُّه في `schema_migrations` سطرٌ يشهد على نفسه، وهذا الملفُّ نصُّه الكامل. وجُرّب بعد التطبيق
-- في معاملةٍ مُلغاة: الطلبُ والعدولُ للطرفين، والكنّاسُ يمحو من حلّ أجلُه بلا ملف وينقل طلبَ من أكمل ملفَّه.

begin;
set local lock_timeout = '10s';

-- ١) سجلُّ الطلبات
create table public.account_deletion_requests (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  reason       text,
  closed_at    timestamptz,
  closed_how   text check (closed_how in ('cancelled', 'moved_to_profile')),
  constraint account_deletion_requests_closed_pair
    check ((closed_at is null) = (closed_how is null))
);

comment on table public.account_deletion_requests is
  'طلباتُ حذف الحساب ممّن لا صفَّ له في profiles. المهلةُ ثلاثون يومًا كغيره ثمّ يمحوه الكنّاس. ومن أكمل ملفَّه في المهلة انتقل طلبُه إلى profiles.deletion_requested_at (closed_how = moved_to_profile).';

alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon, authenticated;

-- ٢) الطلب: من لا ملفَّ له يُكتب طلبُه في الجدول بدل الردّ
create or replace function public.request_my_account_deletion(p_reason text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid    uuid := auth.uid();
  v_door   text;
  v_at     timestamptz;
  v_gone   timestamptz;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'no_session', 'message', 'لا جلسةَ لك.');
  end if;

  select p.deletion_requested_at, p.deleted_at into v_at, v_gone
  from public.profiles p where p.id = v_uid;

  if not found then
    -- حسابُ دخولٍ بلا ملف: لا عضويّةَ ولا مقعدَ ولا أرشيف، والمهلةُ نفسُها
    select q.requested_at into v_at
    from public.account_deletion_requests q
    where q.user_id = v_uid and q.closed_at is null;

    if v_at is not null then
      return jsonb_build_object('ok', true, 'code', 'already_requested', 'at', v_at,
                                'dueAt', v_at + interval '30 days', 'message', 'طلبُك قائمٌ من قبل.');
    end if;

    insert into public.account_deletion_requests (user_id, requested_at, reason, closed_at, closed_how)
    values (v_uid, now(), v_reason, null, null)
    on conflict (user_id) do update
      set requested_at = excluded.requested_at, reason = excluded.reason,
          closed_at = null, closed_how = null
    returning requested_at into v_at;

    -- user_id يشير إلى profiles، فصاحبُ الطلب في target_id
    insert into public.activity_log (user_id, action_type, target_type, target_id, details)
    values (null, 'request_account_deletion', 'auth_user', v_uid::text,
            jsonb_build_object('reason', v_reason, 'dueAt', v_at + interval '30 days', 'without_profile', true));

    return jsonb_build_object('ok', true, 'code', 'requested', 'at', v_at, 'dueAt', v_at + interval '30 days');
  end if;

  if v_gone is not null then
    return jsonb_build_object('ok', false, 'code', 'already_deleted', 'message', 'هذا الحسابُ محذوفٌ أصلًا.');
  end if;

  v_door := membership_exit_door(v_uid);
  if v_door = 'sealed' then
    return jsonb_build_object('ok', false, 'code', 'sealed', 'door', v_door,
      'message', 'مقعدُ رئيس النادي محميٌّ في القاعدة: لا يُخليه أحدٌ ولا تُخليه أنت، فلا سبيل إلى حذف الحساب من هنا.');
  elsif v_door = 'request' then
    return jsonb_build_object('ok', false, 'code', 'needs_request', 'door', v_door,
      'message', 'منصبُك يسبق حسابَك: اطلب إنهاء عضويّتك أوّلًا، فإذا أُقرّ صرتَ صاحبَ حسابٍ ولك الحذف.');
  elsif v_door = 'end_now' then
    return jsonb_build_object('ok', false, 'code', 'needs_end', 'door', v_door,
      'message', 'أنهِ عضويّتَك أوّلًا، ثمّ احذف حسابَك إن شئت.');
  end if;

  if v_at is not null then
    return jsonb_build_object('ok', true, 'code', 'already_requested', 'at', v_at,
                              'dueAt', v_at + interval '30 days', 'message', 'طلبُك قائمٌ من قبل.');
  end if;

  update public.profiles
     set deletion_requested_at = now(),
         deletion_reason       = v_reason,
         accepts_marketing     = false,
         updated_at            = now()
   where id = v_uid
  returning deletion_requested_at into v_at;

  insert into public.activity_log (user_id, action_type, target_type, target_id, details)
  values (v_uid, 'request_account_deletion', 'profile', v_uid::text,
          jsonb_build_object('reason', v_reason, 'dueAt', v_at + interval '30 days'));

  return jsonb_build_object('ok', true, 'code', 'requested', 'at', v_at, 'dueAt', v_at + interval '30 days');
end;
$function$;

-- ٣) العدول: الملفُّ أوّلًا كما كان، ثمّ طلبُ من لا ملفَّ له
create or replace function public.cancel_my_account_deletion()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_had timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'no_session', 'message', 'لا جلسةَ لك.');
  end if;

  update public.profiles
     set deletion_requested_at = null,
         deletion_reason       = null,
         updated_at            = now()
   where id = v_uid and deleted_at is null and deletion_requested_at is not null
  returning now() into v_had;

  if v_had is not null then
    insert into public.activity_log (user_id, action_type, target_type, target_id, details)
    values (v_uid, 'cancel_account_deletion', 'profile', v_uid::text, '{}'::jsonb);
    return jsonb_build_object('ok', true, 'code', 'cancelled', 'message', 'أُلغيَ الطلب. حسابُك كما كان.');
  end if;

  update public.account_deletion_requests
     set closed_at = now(), closed_how = 'cancelled'
   where user_id = v_uid and closed_at is null
  returning now() into v_had;

  if v_had is null then
    return jsonb_build_object('ok', false, 'code', 'nothing_to_cancel', 'message', 'لا طلبَ قائمًا.');
  end if;

  insert into public.activity_log (user_id, action_type, target_type, target_id, details)
  values (null, 'cancel_account_deletion', 'auth_user', v_uid::text, jsonb_build_object('without_profile', true));

  return jsonb_build_object('ok', true, 'code', 'cancelled', 'message', 'أُلغيَ الطلب. حسابُك كما كان.');
end;
$function$;

-- ٤) الكنّاس: ينقل طلبَ من أكمل ملفَّه في المهلة، ويمحو من حلّ أجلُه بلا ملف، ثمّ طريقُه المعتاد
create or replace function public.sweep_account_deletions()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  r      record;
  q      record;
  v_done integer := 0;
begin
  -- (أ) من أكمل ملفَّه في المهلة: يمضي طلبُه بتاريخه الأوّل في طريق الملفّ المعتاد
  update public.profiles p
     set deletion_requested_at = q2.requested_at,
         deletion_reason       = coalesce(p.deletion_reason, q2.reason),
         accepts_marketing     = false,
         updated_at            = now()
    from public.account_deletion_requests q2
   where q2.user_id = p.id and q2.closed_at is null
     and p.deletion_requested_at is null and p.deleted_at is null;

  update public.account_deletion_requests q2
     set closed_at = now(), closed_how = 'moved_to_profile'
   where q2.closed_at is null
     and exists (select 1 from public.profiles p where p.id = q2.user_id);

  -- (ب) من حلّ أجلُه ولا ملفَّ له: مَحْوٌ تامّ (ويذهب صفُّ طلبه معه بالتتابع)
  for q in
    select q2.user_id
    from public.account_deletion_requests q2
    where q2.closed_at is null
      and q2.requested_at <= now() - interval '30 days'
  loop
    delete from auth.users u where u.id = q.user_id;

    insert into public.activity_log (user_id, action_type, target_type, target_id, details)
    values (null, 'execute_account_deletion', 'auth_user', q.user_id::text,
            jsonb_build_object('source', 'sweep', 'without_profile', true));

    v_done := v_done + 1;
  end loop;

  -- (ج) أصحابُ الملفّات كما كانوا
  for r in
    select p.id, p.joined_date, p.account_status
    from public.profiles p
    where p.deletion_requested_at is not null
      and p.deleted_at is null
      and p.deletion_requested_at <= now() - interval '30 days'
  loop
    if r.joined_date is not null and r.account_status is distinct from 'suspended' then
      perform public._apply_termination(r.id, r.id, 'حذفَ صاحبُها حسابَه', 'account_deletion');
    end if;

    update public.profiles
       set deleted_at = now(), updated_at = now()
     where id = r.id;

    delete from auth.users u where u.id = r.id;

    begin
      delete from public.profiles where id = r.id;
    exception when foreign_key_violation then
      null;
    end;

    insert into public.activity_log (user_id, action_type, target_type, target_id, details)
    values (null, 'execute_account_deletion', 'profile', r.id::text,
            jsonb_build_object('source', 'sweep'));

    v_done := v_done + 1;
  end loop;

  return v_done;
end;
$function$;

commit;
