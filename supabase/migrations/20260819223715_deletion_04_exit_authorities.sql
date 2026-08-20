-- **تصحيحُ سلطات الخروج، وقتلُ حالةِ «عضوٍ بلا مقعد»** — تعديلاتُ المالك على ما بُني قبل ساعة.
--
-- يتلو `20260820_deletion_03_membership_exit.sql` ويعدّل عليه أربعةَ أشياء:
--
--   ١. **المستشارُ كالرئيسين**: يُخلي مقعدَه بيده، أو يُخليه أحدُ الرئيسين. ولم يكن يملك
--      إخلاءَ مقعده بنفسه (لا صفَّ له في `position_authority`)، فيُعطاه ههنا.
--   ٢. **قائدا الإدارتين** يقضي في طلبهما الرئيسان وحدَهما، لا قائدُ الموارد (وهو أحدُهما،
--      فلا يقضي أحدٌ في طلب نفسه ولا في طلب نظيره).
--   ٣. **عضوُ إدارة الضمان** يقضي في طلبه قائدُ **إدارته**، لا قائدُ الموارد. فالسلطةُ تتبع
--      الإدارةَ التي ينتمي إليها لا إدارةً أخرى.
--   ٤. **ولا عضويّةَ حيّةٌ بلا مقعد**: قال المالك إنّ دستور النادي لا يعرف عضوًا حيًّا بلا
--      منصب، وأمر بقتل الحالة لا بمعالجتها. فنزل حارسان مؤجَّلان يمنعان نشوءَها من الطرفين.

begin;

-- ── ١. المستشارُ يُخلي مقعدَه بيده ──────────────────────────────────────────────
-- `position_authority` هي مرجعُ `can_assign_role`، فمن ليس فيها لا يُسنِد ولا يُزيل. والرئيسان
-- يملكان مقعدَ المستشار من قبلُ، وهذا يزيد المستشارَ على نفسه: يُخلي مقعدَه ولا يُسنِده لغيره.
insert into public.position_authority (role_name, target_roles, own_unit_roles, note)
values ('president_advisor', array['president_advisor'], array[]::text[],
        'مستشارُ رئيس النادي — مقعدُه هو وحدَه، يُخليه بيده. زيد 2026-08-20 بأمر المالك: «إمّا بنفسه أو من خلال الرئيسين».')
on conflict (role_name) do update
  set target_roles = excluded.target_roles,
      note         = excluded.note;

-- ── ٢. البابُ يتبدّل: المستشارُ يلحق بالرئيسين ─────────────────────────────────
create or replace function public.membership_exit_door(p_user uuid)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select case
    -- مقعدٌ يُخليه صاحبُه بيده: لا يُطلَب فيه إذنٌ من أحد (والرئيسان لا سلطةَ فوقهما أصلًا،
    -- والمستشارُ أُعطي مقعدَه بأمر المالك ٢٠٢٦-٠٨-٢٠)
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name in ('club_president', 'executive_council_president', 'president_advisor'))
      then 'vacate_seat'
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name <> 'committee_member')
      then 'request'
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active)
      or exists (select 1 from profiles p where p.id = p_user
                   and p.joined_date is not null and p.account_status is distinct from 'suspended')
      then 'end_now'
    else 'delete'
  end;
$$;

-- ── ٣. من يقضي في طلب فلان؟ السلطةُ تتبع مقعدَه ────────────────────────────────
-- كانت ثلاثةً لكلّ أحد، فصارت تُقرأ من مقعد الطالب: قائدا الإدارتين للرئيسين، وعضوُ الضمان
-- لقائد الضمان، وما سواهما لقائد الموارد ومن فوقه. **ومصدرٌ واحدٌ لها**: تقرؤه الشاشةُ
-- لتعرض الأسماء، وتقرؤه دالّةُ القرار لتردّ من ليس له.
create or replace function public.exit_decider_roles(p_user uuid)
returns text[]
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select case
    -- قائدُ إدارةٍ: الرئيسان وحدَهما (فلا يقضي قائدُ الموارد في نظيره ولا في نفسه)
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name in ('hr_committee_leader', 'qa_committee_leader'))
      then array['club_president', 'executive_council_president']
    -- عضوُ إدارة الضمان: قائدُ إدارته هو، لا قائدُ الموارد
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name = 'qa_admin_member')
      then array['club_president', 'executive_council_president', 'qa_committee_leader']
    else array['club_president', 'executive_council_president', 'hr_committee_leader']
  end;
$$;

revoke all on function public.exit_decider_roles(uuid) from public, anon;
grant execute on function public.exit_decider_roles(uuid) to authenticated;

comment on function public.exit_decider_roles(uuid) is
  'من يقضي في طلب خروج فلان — السلطةُ تتبع مقعدَه (2026-08-20): قائدا الإدارتين للرئيسين، وعضوُ الضمان لقائد إدارته، وما سواهما لقائد الموارد ومن فوقه.';

/** أهذا القارئُ من أهل القضاء أصلًا؟ لفتح الغرفة وسياسةِ القراءة. */
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
      and ur.role_name in ('club_president', 'executive_council_president',
                           'hr_committee_leader', 'qa_committee_leader')
  );
$$;

/** وهل يقضي في **هذا** الطلب بعينه؟ الحَكَمُ الحقيقيّ، تناديه دالّةُ القرار والشاشةُ معًا. */
create or replace function public.can_decide_membership_exit(p_actor uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select p_actor is not null and p_actor is distinct from p_target and exists (
    select 1 from user_roles ur
    where ur.user_id = p_actor and ur.is_active
      and ur.role_name = any (public.exit_decider_roles(p_target))
  );
$$;

revoke all on function public.can_decide_membership_exit(uuid, uuid) from public, anon;
grant execute on function public.can_decide_membership_exit(uuid, uuid) to authenticated;

-- ودالّةُ القرار تحتكم إلى الحَكَم الجديد
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
  select * into v_req from membership_exit_requests where id = p_request for update;
  if not found or v_req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'gone', 'message', 'هذا الطلبُ لم يعد قائمًا.');
  end if;

  -- **الحارسُ يتبع مقعدَ الطالب لا مقعدَ القاضي وحدَه**، ويردّ من قضى في طلب نفسه.
  if not can_decide_membership_exit(v_actor, v_req.user_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden',
      'message', 'ليس لك القضاءُ في هذا الطلب.');
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

  -- **الترتيبُ مقصود**: تُنهى العضويّةُ أوّلًا ثمّ تُطفأ المقاعد. وحارسُ «لا عضويّةَ بلا مقعد»
  -- مؤجَّلٌ إلى ختم المعاملة فلا يبالي بالترتيب، لكنّ الصوابَ أن يُكتب كما يُقرأ.
  perform _apply_termination(v_actor, v_req.user_id,
    'أنهى عضويّتَه بطلبه: ' || v_req.reason, 'exit_request');

  update user_roles set is_active = false
   where user_id = v_req.user_id and is_active;

  update membership_exit_requests
     set status = 'approved', decided_by = v_actor, decided_at = now(), decision_reason = v_reason
   where id = p_request;

  return jsonb_build_object('ok', true, 'message', 'قُبل الطلب. انتهت عضويّتُه ونُزعت مقاعدُه، وصار صاحبَ حساب.');
end;
$$;

-- وزرُّ الخروج الفوريّ يتبع الترتيبَ نفسَه
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

  perform _apply_termination(v_uid, v_uid, 'أنهى عضويّتَه بنفسه: ' || v_reason, 'self_exit');
  update user_roles set is_active = false where user_id = v_uid and is_active;

  return jsonb_build_object('ok', true,
    'message', 'انتهت عضويّتُك. صرتَ صاحبَ حسابٍ في أديب، ولك أن تحذف حسابَك إن شئت.');
end;
$$;

-- ── ٤. لا عضويّةَ حيّةٌ بلا مقعد ────────────────────────────────────────────────
-- **حكمٌ دستوريٌّ لا قاعدةُ واجهة** (المالك، ٢٠٢٦-٠٨-٢٠): «لا يجوز بدستور نادي أديب أن يكون
-- عضوٌ حيٌّ بلا منصب». فالحالةُ تُقتل لا تُعالَج، ويُمنع نشوءُها من البابين:
--
--   (أ) نزعُ آخرِ مقعدٍ عن عضوٍ حيّ.
--   (ب) إحياءُ عضويّةٍ لمن لا مقعدَ له (`restore_membership` نموذجًا).
--
-- **والحارسُ مؤجَّلٌ إلى ختم المعاملة** (`constraint trigger ... initially deferred`) عن قصد:
-- فأفعالُنا تنزع المقعدَ وتُنهي العضويّة في معاملةٍ واحدة، ولو فحصنا بين السطرين لَسقط الفعلُ
-- الصحيحُ لأنّ نصفَه لم يُكتب بعدُ. فالحكمُ على الحال المستقرّة لا على لحظةٍ عابرة.
--
-- **والحيُّ من عرّفه المستودع**: `joined_date` غيرُ فارغ و`account_status = 'active'`. فالمنتهيةُ
-- عضويّتُه (`suspended`) والموقوفُ (`inactive`، ومنه مقعدُ المعاينة) خارجَ الحكم.
create or replace function public.guard_live_member_has_seat()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_name text;
begin
  if not exists (select 1 from profiles p
                 where p.id = v_user and p.joined_date is not null and p.account_status = 'active')
  then
    return null;
  end if;

  if exists (select 1 from user_roles ur where ur.user_id = v_user and ur.is_active) then
    return null;
  end if;

  select full_name into v_name from profiles where id = v_user;
  raise exception 'لا عضويّةَ حيّةٌ بلا مقعد (%): أسنِد له مقعدًا، أو أنهِ عضويّتَه.', coalesce(v_name, v_user::text)
    using errcode = '23514';
end;
$$;

/** الوجهُ الآخر: صفُّ `profiles` نفسُه حين تُحيا عضويّتُه أو يُكتب تاريخُ انضمامه. */
create or replace function public.guard_live_member_has_seat_profile()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.joined_date is null or new.account_status is distinct from 'active' then
    return null;
  end if;
  if exists (select 1 from user_roles ur where ur.user_id = new.id and ur.is_active) then
    return null;
  end if;
  raise exception 'لا عضويّةَ حيّةٌ بلا مقعد (%): أسنِد له مقعدًا قبل أن تُحيا عضويّتُه.', coalesce(new.full_name, new.id::text)
    using errcode = '23514';
end;
$$;

drop trigger if exists trg_live_member_has_seat on public.user_roles;
create constraint trigger trg_live_member_has_seat
  after insert or update or delete on public.user_roles
  deferrable initially deferred
  for each row execute function public.guard_live_member_has_seat();

drop trigger if exists trg_live_member_has_seat_profile on public.profiles;
create constraint trigger trg_live_member_has_seat_profile
  after update of account_status, joined_date on public.profiles
  deferrable initially deferred
  for each row execute function public.guard_live_member_has_seat_profile();

commit;

-- ── ما لا يُنفَّذ آليًّا ─────────────────────────────────────────────────────────
-- في القاعدة اليومَ **صفٌّ واحدٌ يخالف الحكم**: عضوٌ حيٌّ بلا مقعدٍ من قبل نزول الحارس.
-- والحارسُ لا يمسّه (لا يفحص إلّا صفًّا يُكتب)، فيبقى حتى يقضي فيه المالك: مقعدٌ يُسنَد، أو
-- عضويّةٌ تُنهى. وكشفُهم:
--
--   select p.id, p.full_name
--   from profiles p
--   where p.joined_date is not null and p.account_status = 'active'
--     and not exists (select 1 from user_roles ur where ur.user_id = p.id and ur.is_active);
