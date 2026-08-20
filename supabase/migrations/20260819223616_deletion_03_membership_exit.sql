-- **الخروجُ من العضويّة قبل حذف الحساب** — ثلاثةُ أبوابٍ لا بابٌ واحد.
--
-- قرارُ المالك ٢٠ أغسطس ٢٠٢٦، ناسخًا ما بُني في `20260819_deletion_02`: كان حاملُ المنصب
-- يُمنع من الحذف حتى يُعفى، فرأى المالكُ في معاينة `/ui/account-deletion` أنّ ذلك يعلّق
-- خروجَ مئةٍ وخمسةٍ وثلاثين عضوَ لجنةٍ على ثلاثةِ أشخاصٍ في النادي كلِّه. فصار:
--
--   ١. **عضوُ اللجنة التنفيذيّة** يُنهي عضويّتَه **بزرٍّ** بلا طلبٍ ولا انتظار، ثمّ يصير
--      صاحبَ حسابٍ فيحذف حسابَه إن شاء. ومثلُه العضوُ الذي لا مقعدَ له أصلًا.
--   ٢. **من يحمل منصبًا قياديًّا** (منسّق · قائد · نائب · قائدا الإدارتين · عضواهما ·
--      المستشار) يرى **«طلب إنهاء عضوية»** لا زرَّ حذف. ويقضي في الطلب أحدُ ثلاثة:
--      رئيسُ النادي، أو رئيسُ المجلس التنفيذيّ، أو قائدُ إدارة الموارد البشريّة.
--   ٣. **رئيسُ النادي ورئيسُ المجلس التنفيذيّ** مستثنيان: لا أحدَ فوقهما يُقرّ لهما، فيُخليان
--      مقعدَهما بأنفسهما (وهما يملكان ذلك) ثمّ يمضيان كمن سواهما.
--
-- **والسببُ إجباريٌّ في البابين** بأمرِه: خروجُ إنسانٍ من النادي واقعةٌ تُقرأ بعد سنة، ولا
-- تُقرأ بلا علّتها. وحدُّه خمسةُ محارف كحدِّ سبب الإنذار في هذا المستودع.

begin;

-- ── ١. أيُّ بابٍ يرى صاحبُ الحساب؟ ──────────────────────────────────────────────
-- **مصدرٌ واحدٌ للحكم**: تقرؤه الشاشاتُ الثلاث وتقرؤه الدوالُّ نفسُها قبل أن تكتب، فلا
-- يفترق ما يُعرَض عمّا يُنفَّذ. وأربعُ قيمٍ لا خامسة لها:
--
--   `vacate_seat` رئيسٌ يُخلي مقعدَه بيده أوّلًا
--   `request`     منصبٌ قياديٌّ: طلبٌ يُقرّه أحدُ الثلاثة
--   `end_now`     عضوُ لجنةٍ أو عضوٌ بلا مقعد: زرٌّ يُنهي عضويّتَه في حينه
--   `delete`      صاحبُ حسابٍ لا عضويّةَ له ولا مقعد: بابُ حذف الحساب
--
-- ومقعدُ العضويّة عندنا `committee_member` نصًّا لا `committees.member_role_name`: هذا
-- الأخيرُ يحمل في الإدارتين `hr_admin_member` و`qa_admin_member`، وهما بقرار المالك في
-- بابِ الطلب لا في بابِ الزرّ.
create or replace function public.membership_exit_door(p_user uuid)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select case
    -- مقعدٌ لا يُخليه إلّا صاحبُه: لا سلطةَ فوقه تُقرّ له
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name in ('club_president', 'executive_council_president'))
      then 'vacate_seat'
    -- مقعدٌ قياديٌّ آخر: الخروجُ منه يُقرّ
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name <> 'committee_member')
      then 'request'
    -- عضوُ لجنةٍ تنفيذيّة، أو عضويّةٌ قائمةٌ بلا مقعد
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active)
      or exists (select 1 from profiles p where p.id = p_user
                   and p.joined_date is not null and p.account_status is distinct from 'suspended')
      then 'end_now'
    else 'delete'
  end;
$$;

revoke all on function public.membership_exit_door(uuid) from public, anon;
grant execute on function public.membership_exit_door(uuid) to authenticated;

comment on function public.membership_exit_door(uuid) is
  'أيُّ بابِ خروجٍ يرى صاحبُ الحساب: vacate_seat | request | end_now | delete. مصدرٌ واحدٌ للشاشات وللدوالّ (2026-08-20).';

-- ── ٢. من يقضي في الطلب ────────────────────────────────────────────────────────
-- ثلاثةٌ بأمر المالك. ولم تُقرأ من `membership_authority` وإن أشبهتها: تلك سلطةُ **إنهاءٍ
-- بحقّ الإدارة** على من دونها، وهذه سلطةُ **قبولِ استقالة**، وهما فعلان يفترقان في النفس
-- وإن تشابها في الأثر. فإذا أراد المالكُ توحيدَهما يومًا فذلك قرارٌ يُكتب لا يُستنبَط.
create or replace function public.can_decide_membership_exit(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = p_actor and ur.is_active
      and ur.role_name in ('club_president', 'executive_council_president', 'hr_committee_leader')
  );
$$;

revoke all on function public.can_decide_membership_exit(uuid) from public, anon;
grant execute on function public.can_decide_membership_exit(uuid) to authenticated;

-- ── ٣. سجلُّ الطلبات ───────────────────────────────────────────────────────────
create table if not exists public.membership_exit_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  -- السببُ إجباريٌّ بأمر المالك، وحدُّه حدُّ سبب الإنذار في هذا المستودع
  reason          text not null check (length(btrim(reason)) >= 5),
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  decided_by      uuid references public.profiles(id),
  decided_at      timestamptz,
  decision_reason text,
  created_at      timestamptz not null default now()
);

-- طلبٌ مفتوحٌ واحدٌ لصاحبه: الثاني ليس طلبًا بل إلحاحًا
create unique index if not exists membership_exit_one_open
  on public.membership_exit_requests (user_id) where status = 'pending';

create index if not exists membership_exit_pending_at
  on public.membership_exit_requests (created_at desc) where status = 'pending';

alter table public.membership_exit_requests enable row level security;

-- القراءةُ لصاحبها وللقاضين فيها. ولا سياسةَ كتابةٍ ألبتّة: البابُ الدوالُّ أدناه وحدَها،
-- فلا يُنشئ أحدٌ طلبًا لغيره ولا يقضي في طلبٍ بيده.
drop policy if exists membership_exit_select on public.membership_exit_requests;
create policy membership_exit_select on public.membership_exit_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or public.can_decide_membership_exit((select auth.uid())));

grant select on public.membership_exit_requests to authenticated;

comment on table public.membership_exit_requests is
  'طلباتُ إنهاء العضويّة ممّن يحمل منصبًا قياديًّا (2026-08-20). يقضي فيها الرئيسُ أو رئيسُ المجلس أو قائدُ الموارد.';

-- ── ٤. الطلب ───────────────────────────────────────────────────────────────────
create or replace function public.request_membership_exit(p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid    uuid := auth.uid();
  v_door   text;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_id     uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'no_session', 'message', 'لا جلسةَ لك.');
  end if;

  if length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'reason_required',
      'message', 'اكتب سببًا: خروجُك واقعةٌ تُقرأ بعد سنة، ولا تُقرأ بلا علّتها.');
  end if;

  v_door := membership_exit_door(v_uid);
  if v_door <> 'request' then
    return jsonb_build_object('ok', false, 'code', 'wrong_door', 'door', v_door,
      'message', 'ليس هذا بابَك.');
  end if;

  if exists (select 1 from membership_exit_requests r where r.user_id = v_uid and r.status = 'pending') then
    return jsonb_build_object('ok', false, 'code', 'already_pending', 'message', 'طلبُك قائمٌ ينتظر القرار.');
  end if;

  insert into membership_exit_requests (user_id, reason) values (v_uid, v_reason)
  returning id into v_id;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_uid, 'request_membership_exit', 'profile', v_uid::text,
          jsonb_build_object('request_id', v_id, 'reason', v_reason));

  return jsonb_build_object('ok', true, 'id', v_id,
    'message', 'أُرسل طلبُك. يقضي فيه رئيسُ النادي أو رئيسُ المجلس التنفيذيّ أو قائدُ إدارة الموارد.');
end;
$$;

revoke all on function public.request_membership_exit(text) from public, anon;
grant execute on function public.request_membership_exit(text) to authenticated;

-- ── ٥. سحبُ الطلب ──────────────────────────────────────────────────────────────
create or replace function public.withdraw_membership_exit()
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_n   integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'no_session', 'message', 'لا جلسةَ لك.');
  end if;

  update membership_exit_requests
     set status = 'withdrawn', decided_at = now()
   where user_id = v_uid and status = 'pending';
  get diagnostics v_n = row_count;

  if v_n = 0 then
    return jsonb_build_object('ok', false, 'code', 'nothing', 'message', 'لا طلبَ قائمًا.');
  end if;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_uid, 'withdraw_membership_exit', 'profile', v_uid::text, '{}'::jsonb);

  return jsonb_build_object('ok', true, 'message', 'سُحب طلبُك. عضويّتُك كما هي.');
end;
$$;

revoke all on function public.withdraw_membership_exit() from public, anon;
grant execute on function public.withdraw_membership_exit() to authenticated;

-- ── ٦. القضاءُ في الطلب ────────────────────────────────────────────────────────
-- **القبولُ ينزع المقاعدَ كلَّها ثمّ يُنهي العضويّة**، ولا يُنادى `revoke_position` ههنا وإن
-- بدا أخًا لهذا الفعل: تلك تُرجع صاحبَ المنصب **عضوًا في لجنته** بعد نزعه، وهو نقيضُ
-- المقصود ههنا. فمن خرج خرج، ولا يُعاد إلى مقعدٍ لم يطلبه.
create or replace function public.decide_membership_exit(p_request uuid, p_approve boolean, p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor  uuid := auth.uid();
  v_req    membership_exit_requests%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_actor is null or not can_decide_membership_exit(v_actor) then
    return jsonb_build_object('ok', false, 'code', 'forbidden', 'message', 'ليس لك القضاءُ في هذا الطلب.');
  end if;

  select * into v_req from membership_exit_requests where id = p_request for update;
  if not found or v_req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'gone', 'message', 'هذا الطلبُ لم يعد قائمًا.');
  end if;

  if v_req.user_id = v_actor then
    return jsonb_build_object('ok', false, 'code', 'self', 'message', 'لا يقضي أحدٌ في طلب نفسه.');
  end if;

  if not p_approve then
    if v_reason is null or length(v_reason) < 5 then
      return jsonb_build_object('ok', false, 'code', 'reason_required',
        'message', 'اكتب سببَ الرفض: من طلب الخروجَ يستحقّ جوابًا لا صمتًا.');
    end if;
    update membership_exit_requests
       set status = 'rejected', decided_by = v_actor, decided_at = now(), decision_reason = v_reason
     where id = p_request;

    insert into activity_log (user_id, action_type, target_type, target_id, details)
    values (v_actor, 'reject_membership_exit', 'profile', v_req.user_id::text,
            jsonb_build_object('request_id', p_request, 'reason', v_reason));

    return jsonb_build_object('ok', true, 'message', 'رُفض الطلب، ووصل صاحبَه سببُه.');
  end if;

  -- القبول: تُطفأ المقاعدُ كلُّها، ثمّ تُنهى العضويّة، فيصير صاحبَ حسابٍ لا غير.
  update user_roles set is_active = false
   where user_id = v_req.user_id and is_active;

  perform _apply_termination(v_actor, v_req.user_id,
    'أنهى عضويّتَه بطلبه: ' || v_req.reason, 'exit_request');

  update membership_exit_requests
     set status = 'approved', decided_by = v_actor, decided_at = now(), decision_reason = v_reason
   where id = p_request;

  return jsonb_build_object('ok', true, 'message', 'قُبل الطلب. نُزعت مقاعدُه وانتهت عضويّتُه، وصار صاحبَ حساب.');
end;
$$;

revoke all on function public.decide_membership_exit(uuid, boolean, text) from public, anon;
grant execute on function public.decide_membership_exit(uuid, boolean, text) to authenticated;

-- ── ٧. الزرُّ الفوريّ ──────────────────────────────────────────────────────────
-- عضوُ اللجنة لا يُستأذَن في خروجه (قرارُ المالك): مقعدُه ليس مقعدًا مسمًّى في الهيكل،
-- فخلوُّه لا يُعطب شجرةً ولا يترك فراغًا يُرى. والفاعلُ هو نفسُه في السجلّ: من أنهى، أنهى.
create or replace function public.end_my_membership(p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid    uuid := auth.uid();
  v_door   text;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'no_session', 'message', 'لا جلسةَ لك.');
  end if;

  if length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'reason_required',
      'message', 'اكتب سببًا: خروجُك واقعةٌ تُقرأ بعد سنة، ولا تُقرأ بلا علّتها.');
  end if;

  v_door := membership_exit_door(v_uid);
  if v_door <> 'end_now' then
    return jsonb_build_object('ok', false, 'code', 'wrong_door', 'door', v_door, 'message', 'ليس هذا بابَك.');
  end if;

  update user_roles set is_active = false where user_id = v_uid and is_active;

  perform _apply_termination(v_uid, v_uid, 'أنهى عضويّتَه بنفسه: ' || v_reason, 'self_exit');

  return jsonb_build_object('ok', true,
    'message', 'انتهت عضويّتُك. صرتَ صاحبَ حسابٍ في أديب، ولك أن تحذف حسابَك إن شئت.');
end;
$$;

revoke all on function public.end_my_membership(text) from public, anon;
grant execute on function public.end_my_membership(text) to authenticated;

-- ── ٨. وبابُ الحذف يضيق إلى أهله ───────────────────────────────────────────────
-- كان يمنع حاملَ المنصب وحدَه ويُنهي العضويّةَ آليًّا في الكنّاس. وقد صار الخروجُ من
-- العضويّة بابًا مستقلًّا يسبقه، فيردُّ الحذفُ **كلَّ من له عضويّةٌ قائمةٌ أو مقعد** ويدلُّه
-- على بابه بدل أن يفعل عنه فعلًا لم يطلبه.
create or replace function public.request_my_account_deletion(p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid  uuid := auth.uid();
  v_door text;
  v_at   timestamptz;
  v_gone timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'no_session', 'message', 'لا جلسةَ لك.');
  end if;

  select p.deletion_requested_at, p.deleted_at into v_at, v_gone
  from public.profiles p where p.id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'no_profile', 'message', 'لا سجلَّ لحسابك.');
  end if;

  if v_gone is not null then
    return jsonb_build_object('ok', false, 'code', 'already_deleted', 'message', 'هذا الحسابُ محذوفٌ أصلًا.');
  end if;

  v_door := membership_exit_door(v_uid);
  if v_door = 'vacate_seat' then
    return jsonb_build_object('ok', false, 'code', 'vacate_seat', 'door', v_door,
      'message', 'أخلِ مقعدَك في الهيكل أوّلًا، فلا سلطةَ فوقه تُخليه عنك.');
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
         deletion_reason       = nullif(btrim(coalesce(p_reason, '')), ''),
         accepts_marketing     = false,
         updated_at            = now()
   where id = v_uid
  returning deletion_requested_at into v_at;

  insert into public.activity_log (user_id, action_type, target_type, target_id, details)
  values (v_uid, 'request_account_deletion', 'profile', v_uid::text,
          jsonb_build_object('reason', nullif(btrim(coalesce(p_reason, '')), ''),
                             'dueAt', v_at + interval '30 days'));

  return jsonb_build_object('ok', true, 'code', 'requested', 'at', v_at, 'dueAt', v_at + interval '30 days');
end;
$$;

commit;
