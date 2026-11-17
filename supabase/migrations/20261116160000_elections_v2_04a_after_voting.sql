-- ════════════════════════════════════════════════════════════════════════════════════════════
-- الدفعة الرابعة من إصلاح الانتخابات: ما يجري بعد فتح التصويت، والحرمان (2026-11-16)
-- المرجع: نظام الانتخابات، الإصدار الثاني، المواد 11 و16 و17 و20 و25 و26.
--
-- ما تفعله:
--   ١. إبطال الأصوات (المادة 16): إذا انتهى ترشّحٌ بعد فتح التصويت، باستبعادٍ أو بغيره، بطلت أصواته
--      وعُلِّمت ولم تُحذف، وأُبلغ أصحابها ليصوّتوا من جديد بأهليّتهم ووزنهم يوم صوتهم الأول. فإن كان
--      التصويت قد أُغلق أُعيد فتحه لهم وحدهم بموعدٍ يضربه من يدير الانتخاب. وإن بقي مرشّحٌ واحد بطلت
--      الأصوات كلّها وأُعيد التصويت من أوّله تزكيةً بموعدٍ يضربه، وإن لم يبقَ أحد تعثّر الانتخاب.
--      ولا يجري هذا على ما ينتهي بالمادة 27.
--   ٢. التجميد في كلّ مرحلةٍ قبل إعلان الفائز (المادة 16): أثناء التصويت يُحجب المجمَّد عن الناخبين
--      ولا يُعلن الفائز ما دام مجمَّدًا، ويقف أجل التعادل ما دام أحد المتعادلين مجمَّدًا (المادة 26).
--   ٣. إعادة فتح الباب بعد التصويت للمتعثّر (المادة 25): تبطل الأصوات كلّها، ويبقى المعتمَد على حاله،
--      وينتهي ترشّح من سقطت تزكيته.
--   ٤. فقد الأهليّة أثناء التصويت (المادة 17): انتهاء العضويّة، ودخول الإدارات الثلاث، وتجميد المنصب
--      الأصيل بتكليفٍ على غير المقعد، تُنهي الترشّح في التصويت أيضًا، فتجري عليها الفقرة الأولى.
--   ٥. الحرمان من الترشّح (المادة 11): لرئيس أدِيب بقرارٍ مكتوب بسببه وأجلٍ لا يجاوز سنة، يرفعه قبل
--      أجله. ولا يقع على ترشّحٍ فُتح تصويته، وينتهي به ما قبل ذلك.
--
-- ما لا تفعله: النقل «بطلبه» أو «بغير طلبه» (المادة 17) يمسّ باب المناصب وشاشته، فله دفعته (الرابعة-ب).
-- وإلى أن تُبنى، من خرج من نطاق المقعد بعد فتح التصويت بقي ترشّحه، وهو حكم «بغير طلبه».
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- ── ١. الأعمدة ────────────────────────────────────────────────────────────────────────────────
alter table public.election_votes
  add column voided_at   timestamptz,
  add column void_reason text;
alter table public.election_votes add constraint election_votes_void_reason_check
  check (void_reason is null or void_reason in ('candidacy_ended', 'single_left', 'reopened'));
alter table public.election_votes add constraint election_votes_void_pair
  check ((voided_at is null) = (void_reason is null));
-- صوتٌ واحدٌ قائم لكلّ ناخب، ويبقى الباطل بجانبه (المادة 20).
alter table public.election_votes drop constraint election_votes_election_id_voter_id_key;
create unique index election_votes_one_live on public.election_votes (election_id, voter_id) where voided_at is null;

alter table public.elections
  add column revote_pending text,
  add column revote_only    boolean not null default false;
alter table public.elections add constraint elections_revote_pending_check
  check (revote_pending is null or revote_pending in ('partial', 'full'));
alter table public.elections drop constraint elections_stall_reason_check;
alter table public.elections add constraint elections_stall_reason_check
  check (stall_reason is null or stall_reason in
         ('no_candidates', 'no_live_after_close', 'confidence_failed', 'no_votes', 'none_left_after_27', 'none_left_in_voting'));

alter table public.election_candidates drop constraint election_candidates_end_reason_check;
alter table public.election_candidates add constraint election_candidates_end_reason_check
  check (end_reason is null or end_reason in
         ('edit_expired', 'excluded', 'membership_ended', 'joined_admin', 'left_scope', 'frozen_by_acting',
          'kept_other_seat', 'debarred', 'confidence_failed'));

alter table public.election_ties add column paused_at timestamptz;

-- ── ٢. الصوت يُختم ولا يُعدَّل، إلا أن يبطل ─────────────────────────────────────────────────────
create or replace function public.prevent_vote_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and coalesce(current_setting('adeeb.vote_op', true), '') = 'void'
     and old.voided_at is null and new.voided_at is not null and new.void_reason is not null
     and (to_jsonb(new) - 'voided_at' - 'void_reason') = (to_jsonb(old) - 'voided_at' - 'void_reason') then
    return new;
  end if;
  raise exception 'الأصوات نهائية ولا يمكن تعديلها أو حذفها';
end;
$$;

-- يُعلِّم أصوات مرشّحٍ (أو الانتخاب كلّه إن فرغ المرشّح) باطلةً، ويُرجع أصحابها.
create or replace function public._void_votes(p_election uuid, p_candidate uuid, p_reason text)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voters uuid[];
begin
  perform set_config('adeeb.vote_op', 'void', true);
  with u as (
    update election_votes set voided_at = now(), void_reason = p_reason
     where election_id = p_election and voided_at is null and (p_candidate is null or candidate_id = p_candidate)
    returning voter_id
  )
  select array_agg(voter_id) into v_voters from u;
  perform set_config('adeeb.vote_op', '', true);
  -- السجلّ يقول كم بطل، ولا يسمّي أصحابه: لا يطّلع عليهم إلا مديرو الانتخابات من تفصيل الأصوات.
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (p_election, null, 'votes_voided',
          jsonb_strip_nulls(jsonb_build_object('candidate_id', p_candidate, 'reason', p_reason,
                                               'count', coalesce(cardinality(v_voters), 0))));
  return coalesce(v_voters, '{}');
end;
$$;
revoke execute on function public._void_votes(uuid, uuid, text) from public, anon, authenticated;

-- ── ٣. ما يجري إذا انتهى ترشّحٌ بعد فتح التصويت (المادة 16) ──────────────────────────────────
create or replace function public._after_candidacy_lost(p_election uuid, p_candidate uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e      elections%rowtype;
  v_left   integer;
  v_voters uuid[];
  v_label  text;
begin
  select * into v_e from elections where id = p_election for update;
  if v_e.status not in ('voting_open', 'voting_closed') or v_e.winner_candidate_id is not null then return; end if;
  v_label := public._election_target_label(p_election);

  -- التعادل الذي كان فيه يسقط، فيُعاد الحسم بعد إعادة التصويت.
  update election_ties set status = 'void', void_reason = 'candidate_ended', decided_at = now()
   where election_id = p_election and status = 'open';

  select count(*) into v_left from election_candidates
   where election_id = p_election and status in ('approved', 'frozen');

  if v_left = 0 then
    if v_e.status = 'voting_open' then
      update elections set status = 'voting_closed' where id = p_election;
      insert into election_audit_log (election_id, actor_id, event_type, payload)
      values (p_election, null, 'status_transition',
              jsonb_build_object('new_status', 'voting_closed', 'auto', true, 'none_left', true));
    end if;
    perform public._stall_election(p_election, 'none_left_in_voting');

  elsif v_left = 1 then
    v_voters := public._void_votes(p_election, null, 'single_left');
    if v_e.status = 'voting_open' then
      update elections set status = 'voting_closed' where id = p_election;
      insert into election_audit_log (election_id, actor_id, event_type, payload)
      values (p_election, null, 'status_transition',
              jsonb_build_object('new_status', 'voting_closed', 'auto', true, 'single_left', true));
    end if;
    update elections set revote_pending = 'full', revote_only = false where id = p_election;
    if cardinality(v_voters) > 0 then
      perform public._send_election_notification(
        p_election, 'specific_users', 'بطل صوتك',
        'لم يبقَ في ' || v_label || ' إلا مرشّحٌ واحد، فبطلت أصواته كلّها، ويُعاد التصويت تزكيةً بموعدٍ يُعلَن (المادة 16).',
        'warning', 'high', v_voters, jsonb_build_object('event', 'votes_voided', 'reason', 'single_left'));
    end if;
    perform public._send_election_notification(
      p_election, 'election_admins', 'حدّد موعد إعادة التصويت',
      'لم يبقَ في ' || v_label || ' إلا مرشّحٌ واحد، فبطلت أصواته كلّها. افتح التصويت من أوّله تزكيةً بموعدٍ تحدّده (المادة 16).',
      'warning', 'high', null, jsonb_build_object('event', 'revote_needed', 'kind', 'full'));

  else
    v_voters := public._void_votes(p_election, p_candidate, 'candidacy_ended');
    if cardinality(v_voters) > 0 then
      if v_e.status = 'voting_open' then
        perform public._send_election_notification(
          p_election, 'specific_users', 'بطل صوتك، فصوّت من جديد',
          'انتهى ترشّح من صوّتَّ له في ' || v_label || '، فبطل صوتك. صوّت من جديد قبل إغلاق التصويت (المادة 16).',
          'warning', 'high', v_voters, jsonb_build_object('event', 'votes_voided', 'reason', 'candidacy_ended'));
      else
        update elections set revote_pending = 'partial' where id = p_election;
        perform public._send_election_notification(
          p_election, 'specific_users', 'بطل صوتك',
          'انتهى ترشّح من صوّتَّ له في ' || v_label || '، فبطل صوتك. سيُفتح لك التصويت من جديد بموعدٍ يُعلَن (المادة 16).',
          'warning', 'high', v_voters, jsonb_build_object('event', 'votes_voided', 'reason', 'candidacy_ended'));
        perform public._send_election_notification(
          p_election, 'election_admins', 'حدّد موعد إعادة التصويت',
          'بطلت أصوات مرشّحٍ انتهى ترشّحه في ' || v_label || ' بعد إغلاق التصويت. افتحه لأصحابها وحدهم بموعدٍ تحدّده (المادة 16).',
          'warning', 'high', null, jsonb_build_object('event', 'revote_needed', 'kind', 'partial'));
      end if;
    end if;
  end if;
end;
$$;
revoke execute on function public._after_candidacy_lost(uuid, uuid) from public, anon, authenticated;

-- إنهاء الترشّح: كما في الدفعة الثانية، ويزيد ما بعد فتح التصويت.
create or replace function public._end_candidacy(p_candidate uuid, p_reason text, p_actor uuid, p_payload jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election uuid;
begin
  perform set_config('adeeb.candidacy_op', 'end', true);
  update election_candidates set status = 'ended', end_reason = p_reason
   where id = p_candidate and public._is_live_candidacy(status)
  returning election_id into v_election;
  perform set_config('adeeb.candidacy_op', '', true);
  if v_election is not null then
    update election_freezes set status = 'closed', outcome = coalesce(nullif(p_payload->>'freeze_outcome', ''), 'ended'),
           decided_by = coalesce(decided_by, p_actor), decided_at = coalesce(decided_at, now())
     where candidate_id = p_candidate and status <> 'closed';
    insert into election_audit_log (election_id, actor_id, event_type, payload)
    values (v_election, p_actor, 'candidacy_ended',
            jsonb_build_object('candidate_id', p_candidate, 'reason', p_reason) || coalesce(p_payload, '{}'::jsonb));
    if p_reason <> 'kept_other_seat' then
      perform public._after_candidacy_lost(v_election, p_candidate);
    end if;
  end if;
end;
$$;
revoke execute on function public._end_candidacy(uuid, text, uuid, jsonb) from public, anon, authenticated;

-- ── ٤. إعادة التصويت (المادة 16) ───────────────────────────────────────────────────────────────
-- يفتحها من يدير الانتخاب بموعدٍ وسبب: لأصحاب الأصوات الباطلة وحدهم، أو من أوّله تزكيةً.
create or replace function public.open_revote(p_election uuid, p_end timestamptz, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_e      elections%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public._can_manage_election(v_uid, p_election) then
    raise exception 'غير مصرح بإعادة التصويت' using errcode = '42501';
  end if;
  select * into v_e from elections where id = p_election for update;
  if not found then raise exception 'الانتخاب غير موجود'; end if;
  if v_e.status <> 'voting_closed' or v_e.revote_pending is null then
    raise exception 'لا إعادة تصويتٍ تنتظر في هذا الانتخاب';
  end if;
  if p_end is null or p_end <= now() then raise exception 'اختر لإغلاق إعادة التصويت موعدًا في المستقبل'; end if;
  if v_reason is null or char_length(v_reason) < 10 then
    raise exception 'اكتب سبب إعادة التصويت (10 أحرف على الأقلّ)، فيُبلَّغ به الناخبون';
  end if;
  update elections
     set status = 'voting_open', voting_end = p_end,
         revote_only = (v_e.revote_pending = 'partial'), revote_pending = null
   where id = p_election;
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (p_election, v_uid, 'revote_opened',
          jsonb_build_object('kind', v_e.revote_pending, 'voting_end', p_end, 'reason', v_reason));
  perform public._send_election_notification(
    p_election, case when v_e.revote_pending = 'partial' then 'specific_users' else 'election_voters' end,
    'أُعيد فتح التصويت',
    'أُعيد فتح التصويت في ' || public._election_target_label(p_election) || ' حتى ' || to_char(p_end at time zone 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI') || '. ' || v_reason,
    'info', 'high',
    case when v_e.revote_pending = 'partial' then
      (select array_agg(distinct v.voter_id) from election_votes v
        where v.election_id = p_election and v.void_reason = 'candidacy_ended'
          and not exists (select 1 from election_votes l where l.election_id = p_election and l.voter_id = v.voter_id and l.voided_at is null))
    end,
    jsonb_build_object('event', 'revote_opened', 'kind', v_e.revote_pending));
end;
$$;
grant execute on function public.open_revote(uuid, timestamptz, text) to authenticated;

-- الانتقالات: كما في الدفعة الثالثة، ويزيد بابان: فتح التصويت من جديد لما بطلت أصواته، وإعادة فتح
-- الترشّح بعد التصويت للمتعثّر (المادة 25). وبإغلاق التصويت يزول قصره على أصحاب الأصوات الباطلة.
create or replace function public.enforce_election_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean := false;
begin
  if old.status = new.status then return new; end if;

  if new.status = 'cancelled' then
    if old.status = 'completed' then raise exception 'لا يمكن إلغاء انتخاب مكتمل'; end if;
    return new;
  end if;

  if new.status = 'completed' and new.completed_by = 'appointment' then
    if new.appointed_user_id is null then raise exception 'الاكتمال بالتعيين يلزمه من عُيّن'; end if;
    if old.stalled_at is null then raise exception 'لا يُعيَّن إلا على مقعدٍ تعثّر انتخابه (المادة 25)'; end if;
    if old.status not in ('candidacy_open', 'candidacy_closed', 'voting_closed', 'cancelled') then
      raise exception 'انتقال غير مسموح للحالة: % → %', old.status, new.status;
    end if;
    return new;
  end if;

  if old.status = 'candidacy_open' and new.status = 'candidacy_closed' then
    v_ok := true;
  elsif old.status = 'candidacy_closed' and new.status = 'candidacy_open' then
    v_ok := true;
  elsif old.status = 'candidacy_closed' and new.status = 'voting_open' then
    v_ok := true;
    new.voting_opened_at := coalesce(new.voting_opened_at, now());
  elsif old.status = 'voting_open' and new.status = 'voting_closed' then
    v_ok := true;
    new.revote_only := false;
  elsif old.status = 'voting_closed' and new.status = 'voting_open' then
    if old.revote_pending is null then raise exception 'لا يُعاد فتح التصويت إلا لما بطلت أصواته (المادة 16)'; end if;
    v_ok := true;
  elsif old.status = 'voting_closed' and new.status = 'candidacy_open' then
    if old.stalled_at is null then raise exception 'لا يُعاد فتح الترشّح بعد التصويت إلا لانتخابٍ متعثّر (المادة 25)'; end if;
    v_ok := true;
  elsif old.status = 'voting_closed' and new.status = 'completed' then
    v_ok := true;
    if new.winner_candidate_id is null then raise exception 'لا يمكن إنهاء الانتخاب دون إعلان فائز'; end if;
    new.completed_by := 'winner';
    new.winner_declared_at := coalesce(new.winner_declared_at, now());
  end if;

  if not v_ok then
    raise exception 'انتقال غير مسموح للحالة: % → %', old.status, new.status;
  end if;
  return new;
end;
$$;

-- ── ٥. الإدلاء بالصوت ─────────────────────────────────────────────────────────────────────────
create or replace function public.cast_vote(p_election uuid, p_candidate uuid, p_choice text default 'approve')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     uuid;
  v_choice text := coalesce(nullif(trim(p_choice), ''), 'approve');
begin
  if v_choice not in ('approve', 'reject') then
    raise exception 'رأيٌ غير معروف في بطاقة الاقتراع';
  end if;
  if v_choice = 'reject' and not public.is_confidence_election(p_election) then
    raise exception 'الاعتراض لا يكون إلّا في تزكية مرشّحٍ وحيد';
  end if;
  if p_candidate is null then
    raise exception 'لا مرشّحَ في بطاقتك';
  end if;
  if exists (select 1 from election_votes v
             where v.election_id = p_election and v.voter_id = auth.uid() and v.voided_at is null) then
    raise exception 'بطاقتُك في هذا المقعد مختومةٌ، ولا يُعاد الصوت';
  end if;
  insert into election_votes (election_id, voter_id, candidate_id, vote_weight, voter_role_snapshot, vote_choice)
  values (p_election, auth.uid(), p_candidate, 1.0, 'placeholder', v_choice)
  returning id into v_id;
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (p_election, auth.uid(), 'vote_cast', jsonb_build_object('vote_id', v_id));
  return v_id;
end;
$$;

-- الأهليّة والوزن: من بطل صوته لانتهاء ترشّح من صوّت له يصوّت بأهليّته ووزنه يوم صوته الأول.
-- وإعادة التصويت المقصورة لا يدخلها غيرهم.
create or replace function public.enforce_vote_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election elections%rowtype;
  v_cand     election_candidates%rowtype;
  v_prev     election_votes%rowtype;
begin
  select * into v_election from elections where id = new.election_id;
  if not found or v_election.archived_at is not null then
    raise exception 'انتخاب غير موجود أو مؤرشف';
  end if;
  if v_election.status <> 'voting_open' then
    raise exception 'التصويت غير مفتوح';
  end if;
  if new.voter_id is distinct from auth.uid() then
    raise exception 'لا يمكن التصويت نيابة عن مستخدم آخر';
  end if;
  if new.vote_choice is null or new.vote_choice not in ('approve', 'reject') then
    raise exception 'رأيٌ غير معروف في بطاقة الاقتراع';
  end if;
  if new.vote_choice = 'reject' and not is_confidence_election(new.election_id) then
    raise exception 'الاعتراض لا يكون إلّا في تزكية مرشّحٍ وحيد';
  end if;
  if new.candidate_id is null then
    raise exception 'لا مرشّحَ في بطاقتك';
  end if;
  select * into v_cand from election_candidates where id = new.candidate_id;
  if not found or v_cand.election_id <> new.election_id or v_cand.status <> 'approved' then
    raise exception 'المرشح غير صالح في هذا الانتخاب';
  end if;
  if v_cand.user_id = new.voter_id then
    raise exception 'لا يمكنك التصويت لنفسك';
  end if;

  select * into v_prev from election_votes
   where election_id = new.election_id and voter_id = new.voter_id and void_reason = 'candidacy_ended'
   order by created_at desc limit 1;
  if v_election.revote_only and v_prev.id is null then
    raise exception 'إعادة التصويت هذه لمن بطل صوته وحده (المادة 16)';
  end if;
  if v_prev.id is not null then
    new.vote_weight := v_prev.vote_weight;
    new.voter_role_snapshot := v_prev.voter_role_snapshot;
    return new;
  end if;

  if not is_user_eligible_to_vote(new.voter_id, new.election_id) then
    raise exception 'غير مؤهل للتصويت في هذا الانتخاب';
  end if;
  new.vote_weight := get_vote_weight(new.voter_id);
  new.voter_role_snapshot := coalesce(get_user_primary_role(new.voter_id), 'unknown');
  return new;
end;
$$;

-- الإغلاق حين يصوّت الجميع: والمقصورة تُغلق حين يعيد كلّ من بطل صوته.
create or replace function public.close_voting_on_full_turnout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e elections%rowtype;
begin
  select * into v_e from elections where id = new.election_id for update;
  if v_e.status <> 'voting_open' then return new; end if;
  if v_e.revote_only then
    if exists (
      select 1 from election_votes v
      where v.election_id = new.election_id and v.void_reason = 'candidacy_ended'
        and not exists (select 1 from election_votes l
                        where l.election_id = new.election_id and l.voter_id = v.voter_id and l.voided_at is null)
    ) then return new; end if;
  elsif exists (
    select 1 from public._election_electorate(new.election_id) u
    where not exists (select 1 from election_votes v
                      where v.election_id = new.election_id and v.voter_id = u and v.voided_at is null)
  ) then
    return new;
  end if;
  update elections set status = 'voting_closed' where id = new.election_id;
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (new.election_id, null, 'status_transition',
          jsonb_build_object('new_status', 'voting_closed', 'auto', true, 'all_voted', true));
  perform public._after_voting_closed(new.election_id);
  return new;
end;
$$;

-- ── ٦. لا يُحسب باطل ───────────────────────────────────────────────────────────────────────────
create or replace function public._choice_weight(p_election uuid, p_choice text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(vote_weight), 0)::numeric
  from election_votes
  where election_id = p_election and vote_choice = p_choice and voided_at is null;
$$;

-- يُعدَّل النصّ الحيّ لدالّتين من الدفعة الثالثة بالاستبدال، ويُتحقَّق من وقوع كلّ استبدالٍ مرّةً.
do $patch$
declare
  v_fn  text;
  d     text;
  rep   text[][];
  i     int;
begin
  foreach v_fn in array array['public._resolve_department(uuid)', 'public.enforce_winner_declaration()'] loop
    d := pg_get_functiondef(v_fn::regprocedure);
    if v_fn = 'public._resolve_department(uuid)' then
      rep := array[
        -- ما ينتظر إعادة تصويت لا يُحسم.
        array['    where e.status = ''voting_closed'' and e.archived_at is null and e.winner_candidate_id is null and e.stalled_at is null' || chr(10) || '      and not exists',
              '    where e.status = ''voting_closed'' and e.archived_at is null and e.winner_candidate_id is null and e.stalled_at is null' || chr(10) || '      and e.revote_pending is null' || chr(10) || '      and not exists'],
        array['where v.candidate_id = ec.id and v.vote_choice = ''approve''), 0) as w,',
              'where v.candidate_id = ec.id and v.vote_choice = ''approve'' and v.voided_at is null), 0) as w,']];
    else
      rep := array[
        array['where ev.election_id = new.id and ev.vote_choice = ''approve''',
              'where ev.election_id = new.id and ev.vote_choice = ''approve'' and ev.voided_at is null'],
        array['where election_id = new.id and candidate_id = new.winner_candidate_id and vote_choice = ''approve'';',
              'where election_id = new.id and candidate_id = new.winner_candidate_id and vote_choice = ''approve'' and voided_at is null;']];
    end if;
    for i in 1 .. array_length(rep, 1) loop
      if (length(d) - length(replace(d, rep[i][1], ''))) / length(rep[i][1]) <> 1 then
        raise exception '%: لم يقع الاستبدال % مرّةً واحدة', v_fn, i;
      end if;
      d := replace(d, rep[i][1], rep[i][2]);
    end loop;
    execute d;
  end loop;
end
$patch$;

create or replace function public.get_election_results(p_election uuid)
returns table(candidate_id uuid, candidate_number integer, user_id uuid, full_name text, avatar_url text,
              total_weight numeric, total_votes bigint, is_winner boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_election elections%rowtype;
  v_uid      uuid := auth.uid();
  v_admin    boolean;
  v_viewer   boolean;
begin
  select * into v_election from elections where id = p_election;
  if not found then raise exception 'الانتخاب غير موجود'; end if;
  v_admin  := has_election_admin_permission(v_uid) or coalesce(auth.role(), '') = 'service_role';
  v_viewer := has_election_view_permission(v_uid, p_election);
  if v_admin or (v_viewer and v_election.status in ('voting_closed', 'completed')) then
    return query
    select ec.id, ec.candidate_number, ec.user_id, p.full_name, p.avatar_url,
           coalesce(sum(v.vote_weight), 0)::numeric, count(v.id)::bigint,
           (v_election.winner_candidate_id = ec.id)
    from election_candidates ec
    join profiles p on p.id = ec.user_id
    left join election_votes v on v.candidate_id = ec.id and v.vote_choice = 'approve' and v.voided_at is null
    where ec.election_id = p_election and ec.status in ('approved', 'frozen')
    group by ec.id, ec.candidate_number, ec.user_id, p.full_name, p.avatar_url
    order by 6 desc, 2;
    return;
  end if;
  if v_uid is null or v_election.status <> 'completed' or v_election.winner_candidate_id is null then
    raise exception 'النتائج غير متاحة حتى إعلان الفائز';
  end if;
  return query
  select ec.id, ec.candidate_number, ec.user_id, p.full_name, p.avatar_url, null::numeric, null::bigint, true
  from election_candidates ec join profiles p on p.id = ec.user_id
  where ec.id = v_election.winner_candidate_id;
end;
$$;

-- تفصيل الأصوات لمديري الانتخابات وحدهم، ومعه الباطل وسببه: لا يطّلع على من بطل صوته غيرهم (المادة 16).
drop function public.get_election_vote_detail(uuid);
create function public.get_election_vote_detail(p_election uuid)
returns table(voter_id uuid, voter_name text, voter_role text, candidate_id uuid, candidate_number integer,
              candidate_name text, vote_weight numeric, vote_choice text, voted_at timestamptz,
              voided_at timestamptz, void_reason text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from elections e where e.id = p_election) then
    raise exception 'الانتخاب غير موجود';
  end if;
  if not has_election_admin_permission(auth.uid()) then
    raise exception 'تفصيل الأصوات متاح لإدارة الانتخابات فقط';
  end if;
  return query
  select v.voter_id, vp.full_name, v.voter_role_snapshot, v.candidate_id, ec.candidate_number, cp.full_name,
         v.vote_weight, v.vote_choice, v.created_at, v.voided_at, v.void_reason
  from election_votes v
  left join election_candidates ec on ec.id = v.candidate_id
  left join profiles vp on vp.id = v.voter_id
  left join profiles cp on cp.id = ec.user_id
  where v.election_id = p_election
  order by v.created_at;
end;
$$;
grant execute on function public.get_election_vote_detail(uuid) to authenticated;

-- المشاركة: من صوّت يبقى في عداد من شارك ولو بطل صوته، ويُعرض صوته القائم إن كان (المادة 16).
create or replace function public.get_election_voters_participation(p_election uuid)
returns table(user_id uuid, full_name text, role_name text, has_voted boolean, voted_at timestamptz, vote_weight numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_election elections%rowtype;
begin
  select * into v_election from elections where id = p_election;
  if not found then raise exception 'الانتخاب غير موجود'; end if;
  if not has_election_admin_permission(auth.uid()) and not has_election_view_permission(auth.uid(), p_election) then
    raise exception 'غير مصرح بعرض قائمة المصوّتين';
  end if;
  return query
  with eligible as (
    select distinct ur.user_id as uid
    from user_roles ur join roles r on r.role_name = ur.role_name
    where ur.is_active and r.votes_in_all_elections
    union
    select distinct ur.user_id as uid
    from user_roles ur
    where ur.is_active
      and ((v_election.target_role_name = 'department_head'
            and exists (select 1 from committees c where c.id = ur.committee_id and c.department_id = v_election.target_department_id))
        or (v_election.target_role_name in ('committee_leader', 'deputy_committee_leader')
            and ur.committee_id = v_election.target_committee_id))
    union
    select distinct v.voter_id from election_votes v where v.election_id = p_election
  )
  select p.id, p.full_name, coalesce(get_user_primary_role(p.id), 'unknown'),
         v.id is not null, v.created_at, v.vote_weight
  from eligible e
  join profiles p on p.id = e.uid
  left join lateral (
    select x.id, x.created_at, x.vote_weight from election_votes x
    where x.election_id = p_election and x.voter_id = p.id
    order by (x.voided_at is null) desc, x.created_at desc
    limit 1
  ) v on true
  order by (v.id is not null) desc, p.full_name;
end;
$$;

create or replace function public.get_votable_elections_for_user(p_user uuid default null)
returns table(election_id uuid, target_role_name text, target_committee_id integer, target_committee_ar text,
              target_department_id integer, target_department_ar text, voting_end timestamptz,
              has_voted boolean, view_only boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_self uuid := auth.uid();
  v_user uuid;
begin
  if v_self is null then
    if coalesce(auth.role(), '') = 'service_role' then v_user := p_user;
    else raise exception 'لا جلسةَ لك.' using errcode = '42501'; end if;
  else
    v_user := coalesce(p_user, v_self);
    if v_user <> v_self and not check_user_permission(v_self, 'manage_permissions') then
      raise exception 'ليس لك أن تسأل عن غيرك.' using errcode = '42501';
    end if;
  end if;
  return query
  select e.id, e.target_role_name, e.target_committee_id, c.committee_name_ar, e.target_department_id, d.name_ar,
         e.voting_end,
         exists (select 1 from election_votes v where v.election_id = e.id and v.voter_id = v_user and v.voided_at is null),
         is_sole_candidate(v_user, e.id)
  from elections e
  left join committees  c on c.id = e.target_committee_id
  left join departments d on d.id = e.target_department_id
  where e.status = 'voting_open' and e.archived_at is null
    and (case when e.revote_only
              then exists (select 1 from election_votes v where v.election_id = e.id and v.voter_id = v_user
                           and v.void_reason = 'candidacy_ended')
              else is_user_eligible_to_vote(v_user, e.id) end)
  order by e.voting_end nulls last, e.created_at desc;
end;
$$;

do $patch$
declare
  d text := pg_get_functiondef('public.count_user_election_tabs(uuid)'::regprocedure);
  a text := '     and not exists (select 1 from election_votes v where v.election_id = e.id and v.voter_id = v_user);';
  b text := '     and not exists (select 1 from election_votes v where v.election_id = e.id and v.voter_id = v_user and v.voided_at is null)'
            || chr(10) || '     and (not e.revote_only or exists (select 1 from election_votes v2 where v2.election_id = e.id'
            || ' and v2.voter_id = v_user and v2.void_reason = ''candidacy_ended''));';
begin
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then
    raise exception 'count_user_election_tabs: لم يقع الاستبدال مرّةً واحدة';
  end if;
  execute replace(d, a, b);
end
$patch$;

-- ── ٧. التجميد في كلّ مرحلةٍ قبل الإعلان (المادة 16) ────────────────────────────────────────────
create or replace function public.request_candidacy_freeze(
  p_candidate uuid, p_reason text, p_answer_window interval, p_decide_window interval)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_c      election_candidates%rowtype;
  v_e      elections%rowtype;
  v_id     bigint;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public._is_hr_member(v_uid) then
    raise exception 'التجميد لإدارة الموارد البشرية (المادة 16)' using errcode = '42501';
  end if;
  select * into v_c from election_candidates where id = p_candidate for update;
  if not found then raise exception 'الترشح غير موجود'; end if;
  select * into v_e from elections where id = v_c.election_id;
  if v_c.status not in ('pending', 'approved', 'needs_edit') then
    raise exception 'لا يُجمَّد إلا ترشّحٌ قائم';
  end if;
  if v_e.status not in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed') or v_e.winner_candidate_id is not null then
    raise exception 'لا تجميد بعد إعلان الفائز أو إلغاء الانتخاب';
  end if;
  if v_reason is null or char_length(v_reason) < 10 then
    raise exception 'اكتب سبب التجميد: الضابط الذي خالفه (10 أحرف على الأقلّ)';
  end if;
  if p_answer_window is null or p_answer_window <= interval '0'
     or p_decide_window is null or p_decide_window <= interval '0' then
    raise exception 'حدّد مهلة الإجابة وأجل القرار';
  end if;
  if exists (select 1 from election_freezes where candidate_id = p_candidate and status <> 'closed') then
    raise exception 'على هذا الترشّح تجميدٌ قائم أو طلبٌ ينتظر';
  end if;
  insert into election_freezes (candidate_id, election_id, reason, answer_window, decide_window, requested_by)
  values (p_candidate, v_c.election_id, v_reason, p_answer_window, p_decide_window, v_uid)
  returning id into v_id;
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_c.election_id, v_uid, 'freeze_requested',
          jsonb_build_object('candidate_id', p_candidate, 'freeze_id', v_id, 'reason', v_reason));
  if public._is_hr_leader(v_uid) then
    perform public._apply_freeze(v_id, v_uid);
  end if;
  return v_id;
end;
$$;
grant execute on function public.request_candidacy_freeze(uuid, text, interval, interval) to authenticated;

create or replace function public.approve_candidacy_freeze(p_freeze bigint, p_approve boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_f   election_freezes%rowtype;
begin
  if not public._is_hr_leader(v_uid) then
    raise exception 'الموافقة على التجميد لقائد إدارة الموارد البشرية (المادة 16)' using errcode = '42501';
  end if;
  select * into v_f from election_freezes where id = p_freeze for update;
  if not found or v_f.status <> 'requested' then raise exception 'لا طلب تجميد ينتظر هنا'; end if;
  if p_approve then
    if not exists (select 1 from election_candidates where id = v_f.candidate_id and status in ('pending', 'approved', 'needs_edit'))
       or not exists (select 1 from elections where id = v_f.election_id and winner_candidate_id is null
                      and status in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed')) then
      raise exception 'تغيّر حال الترشّح أو الانتخاب منذ الطلب';
    end if;
    perform public._apply_freeze(p_freeze, v_uid);
  else
    if char_length(btrim(coalesce(p_reason, ''))) < 10 then
      raise exception 'اكتب سبب رفض الطلب (10 أحرف على الأقلّ)';
    end if;
    update election_freezes
       set status = 'closed', outcome = 'declined', decided_by = v_uid, decided_at = now(), decision_reason = btrim(p_reason)
     where id = p_freeze;
    insert into election_audit_log (election_id, actor_id, event_type, payload)
    values (v_f.election_id, v_uid, 'freeze_declined',
            jsonb_build_object('candidate_id', v_f.candidate_id, 'freeze_id', p_freeze, 'reason', btrim(p_reason)));
  end if;
end;
$$;
grant execute on function public.approve_candidacy_freeze(bigint, boolean, text) to authenticated;

-- التجميد يقف به أجل التعادل الذي فيه صاحبه (المادة 26).
create or replace function public._apply_freeze(p_freeze bigint, p_approver uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_f election_freezes%rowtype;
  v_c election_candidates%rowtype;
begin
  select * into v_f from election_freezes where id = p_freeze for update;
  select * into v_c from election_candidates where id = v_f.candidate_id for update;
  perform set_config('adeeb.candidacy_op', 'freeze', true);
  update election_candidates set status = 'frozen' where id = v_c.id;
  perform set_config('adeeb.candidacy_op', '', true);
  update election_freezes
     set status = 'active', approved_by = p_approver, approved_at = now(),
         prior_status = v_c.status,
         edit_remaining = case when v_c.status = 'needs_edit' and v_c.edit_due_at is not null
                               then greatest(v_c.edit_due_at - now(), interval '0') end,
         answer_due = now() + v_f.answer_window
   where id = p_freeze;
  update election_ties set paused_at = now()
   where election_id = v_f.election_id and status = 'open' and paused_at is null and v_c.id = any(candidate_ids);
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_f.election_id, p_approver, 'candidate_frozen',
          jsonb_build_object('candidate_id', v_c.id, 'freeze_id', p_freeze, 'reason', v_f.reason,
                             'requested_by', v_f.requested_by, 'answer_due', now() + v_f.answer_window));
end;
$$;
revoke execute on function public._apply_freeze(bigint, uuid) from public, anon, authenticated;

-- رفع التجميد يعيد الترشّح إلى حاله، ويُكمل أجل التعادل من حيث وقف، ويُعيد الحسم إن كان ينتظره.
create or replace function public._lift_freeze(p_freeze bigint, p_actor uuid, p_outcome text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_f election_freezes%rowtype;
  t   record;
begin
  select * into v_f from election_freezes where id = p_freeze for update;
  if v_f.status not in ('active', 'answered') then return; end if;
  perform set_config('adeeb.candidacy_op', 'lift', true);
  update election_candidates
     set status = v_f.prior_status,
         edit_due_at = case when v_f.prior_status = 'needs_edit' then now() + coalesce(v_f.edit_remaining, interval '0') end
   where id = v_f.candidate_id and status = 'frozen';
  perform set_config('adeeb.candidacy_op', '', true);
  update election_freezes
     set status = 'closed', outcome = p_outcome, decided_by = p_actor, decided_at = now(), decision_reason = p_reason
   where id = p_freeze;
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_f.election_id, p_actor, 'freeze_lifted',
          jsonb_build_object('candidate_id', v_f.candidate_id, 'freeze_id', p_freeze, 'outcome', p_outcome, 'reason', p_reason));

  for t in select id, candidate_ids, paused_at from election_ties
           where election_id = v_f.election_id and status = 'open' and paused_at is not null loop
    if not exists (select 1 from election_candidates where id = any(t.candidate_ids) and status = 'frozen') then
      update election_ties set due_at = due_at + (now() - t.paused_at), paused_at = null where id = t.id;
      perform public._evaluate_tie(t.id);
    end if;
  end loop;
  perform public._after_voting_closed(v_f.election_id);
end;
$$;
revoke execute on function public._lift_freeze(bigint, uuid, text, text) from public, anon, authenticated;

-- التعادل الموقوف لا يُحسم حتى يُرفع التجميد أو يُستبعد صاحبه.
do $patch$
declare
  d text := pg_get_functiondef('public._evaluate_tie(bigint)'::regprocedure);
  a text := '  if v_size = 0 then return; end if;';
  b text := '  if v_size = 0 then return; end if;' || chr(10)
            || '  if exists (select 1 from election_ties where id = p_tie and paused_at is not null) then return; end if;';
begin
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception '_evaluate_tie: لم يقع الاستبدال'; end if;
  execute replace(d, a, b);
  d := pg_get_functiondef('public.sweep_election_deadlines()'::regprocedure);
  a := 'for r in select id from election_ties where status = ''open'' and due_at <= now() loop';
  b := 'for r in select id from election_ties where status = ''open'' and paused_at is null and due_at <= now() loop';
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception 'sweep_election_deadlines: لم يقع الاستبدال'; end if;
  execute replace(d, a, b);
  d := pg_get_functiondef('public.sweep_candidacy_deadlines()'::regprocedure);
  a := 'and (e.status not in (''candidacy_open'', ''candidacy_closed'') or ec.status not in (''pending'', ''approved'', ''needs_edit''));';
  b := 'and (e.status not in (''candidacy_open'', ''candidacy_closed'', ''voting_open'', ''voting_closed'') or e.winner_candidate_id is not null'
       || ' or ec.status not in (''pending'', ''approved'', ''needs_edit''));';
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception 'sweep_candidacy_deadlines: لم يقع الاستبدال'; end if;
  execute replace(d, a, b);
end
$patch$;

-- ── ٨. فقد الأهليّة أثناء التصويت (المادة 17) ──────────────────────────────────────────────────
-- انتهاء العضويّة، ودخول الإدارات الثلاث، وتجميد الأصيل بتكليفٍ على غير المقعد: في كلّ مرحلةٍ قبل
-- الإعلان. والخروج من النطاق بغير ذلك: قبل فتح التصويت وحده، إلى أن يُبنى «بطلبه» (الرابعة-ب).
create or replace function public.cascade_membership_loss_to_candidacy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r        record;
  v_reason text;
  v_act    user_roles%rowtype;
begin
  if new.frozen_by is not null and old.frozen_by is null then
    select * into v_act from user_roles where id = new.frozen_by;
    for r in
      select ec.id from election_candidates ec join elections e on e.id = ec.election_id
      where ec.user_id = new.user_id and public._is_live_candidacy(ec.status)
        and e.archived_at is null and e.winner_candidate_id is null
        and e.status in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed')
        and not (e.target_role_name = v_act.role_name
                 and e.target_committee_id is not distinct from v_act.committee_id
                 and e.target_department_id is not distinct from v_act.department_id)
    loop
      perform public._end_candidacy(r.id, 'frozen_by_acting', null, jsonb_build_object('acting_row', new.frozen_by));
    end loop;
    return new;
  end if;
  if old.is_active = true and new.is_active = false and new.frozen_by is null
     and not exists (
       select 1 from user_roles o
       where o.user_id = new.user_id and o.id <> new.id
         and (o.is_active or o.frozen_by is not null)
         and ((old.committee_id is not null and o.committee_id = old.committee_id)
           or (old.department_id is not null and o.department_id = old.department_id))
     ) then
    v_reason := case when coalesce(public.is_adeeb_member(new.user_id), false) then 'left_scope' else 'membership_ended' end;
    for r in
      select ec.id from election_candidates ec join elections e on e.id = ec.election_id
      where ec.user_id = new.user_id and public._is_live_candidacy(ec.status)
        and e.archived_at is null and e.winner_candidate_id is null
        and (e.status in ('candidacy_open', 'candidacy_closed')
             or (v_reason = 'membership_ended' and e.status in ('voting_open', 'voting_closed')))
        and (v_reason = 'membership_ended'
          or (old.committee_id is not null and e.target_committee_id = old.committee_id)
          or (old.department_id is not null and e.target_department_id = old.department_id)
          or (old.committee_id is not null and e.target_department_id =
                (select c.department_id from committees c where c.id = old.committee_id)
              and not exists (select 1 from user_roles o join committees c2 on c2.id = o.committee_id
                              where o.user_id = new.user_id and o.is_active
                                and c2.department_id = e.target_department_id)))
    loop
      perform public._end_candidacy(r.id, v_reason, null, jsonb_build_object('role_row', new.id));
    end loop;
  end if;
  return new;
end;
$$;

create or replace function public.end_candidacies_on_admin_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.is_active
     and (tg_op = 'INSERT' or not old.is_active or old.role_name is distinct from new.role_name)
     and exists (select 1 from roles ro where ro.role_name = new.role_name and ro.council_type = 'administrative') then
    for r in
      select ec.id from election_candidates ec join elections e on e.id = ec.election_id
      where ec.user_id = new.user_id and public._is_live_candidacy(ec.status)
        and e.archived_at is null and e.winner_candidate_id is null
        and e.status in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed')
    loop
      perform public._end_candidacy(r.id, 'joined_admin', null, jsonb_build_object('role_row', new.id));
    end loop;
  end if;
  return new;
end;
$$;

-- ── ٩. إعادة فتح الباب بعد التصويت للمتعثّر (المادة 25) ─────────────────────────────────────────
-- كما في الدفعة الثالثة، ويزيد بابًا: من «أُغلق التصويت» المتعثّر إلى «باب الترشّح مفتوح». فتبطل
-- الأصوات كلّها، ويبقى المعتمَد على حاله، وينتهي ترشّح من سقطت تزكيته، وتجري المادتان 10 و15 كأنّ
-- التصويت لم يُفتح.
do $patch$
declare
  d text := pg_get_functiondef('public.transition_election(uuid,text,timestamptz,text,timestamptz)'::regprocedure);
  a text := '  elsif v_cur = ''candidacy_closed'' and p_new_status = ''voting_open'' then';
  b text := $b$  elsif v_cur = 'voting_closed' and p_new_status = 'candidacy_open' then
    if v_e.stalled_at is null or v_e.winner_candidate_id is not null then
      raise exception 'لا يُعاد فتح الترشّح بعد التصويت إلا لانتخابٍ متعثّر (المادة 25)';
    end if;
    if p_candidacy_end is null or p_candidacy_end <= now() then
      raise exception 'اختر لإغلاق الباب المعاد فتحه موعدًا في المستقبل (المادة 23)';
    end if;
    if v_reason is null or char_length(v_reason) < 10 then
      raise exception 'اكتب سبب إعادة فتح الباب (10 أحرف على الأقلّ) (المادة 25)';
    end if;
    perform public._void_votes(p_election, null, 'reopened');
    update elections
       set status = 'candidacy_open', candidacy_end = p_candidacy_end, voting_end = null, voting_opened_at = null,
           stalled_at = null, stall_reason = null, revote_pending = null, revote_only = false
     where id = p_election;
    if v_e.stall_reason = 'confidence_failed' then
      perform public._end_candidacy(ec.id, 'confidence_failed', v_uid)
      from election_candidates ec where ec.election_id = p_election and ec.status = 'approved';
    end if;
  elsif v_cur = 'candidacy_closed' and p_new_status = 'voting_open' then$b$;
begin
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception 'transition_election: لم يقع الاستبدال'; end if;
  execute replace(d, a, b);
end
$patch$;

-- ── ١٠. الحرمان من الترشّح (المادة 11) ───────────────────────────────────────────────────────────
create table public.candidacy_bans (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete restrict,
  reason      text not null check (char_length(btrim(reason)) >= 10),
  until_date  date not null,
  issued_by   uuid not null references public.profiles(id) on delete restrict,
  issued_at   timestamptz not null default now(),
  lifted_at   timestamptz,
  lifted_by   uuid references public.profiles(id) on delete restrict,
  lift_reason text,
  check ((lifted_at is null) = (lifted_by is null)),
  check (lifted_at is null or char_length(btrim(coalesce(lift_reason, ''))) >= 10)
);
alter table public.candidacy_bans enable row level security;
revoke all on public.candidacy_bans from anon, authenticated;
revoke all on sequence public.candidacy_bans_id_seq from anon, authenticated;
grant select on public.candidacy_bans to authenticated;
create policy candidacy_bans_select on public.candidacy_bans for select to authenticated
  using (user_id = (select auth.uid()) or public.has_election_admin_permission((select auth.uid())));
create trigger candidacy_bans_no_delete before delete on public.candidacy_bans
  for each row execute function public.forbid_election_delete();
create trigger candidacy_bans_no_truncate before truncate on public.candidacy_bans
  for each statement execute function public.forbid_election_delete();

create or replace function public._is_candidacy_banned(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from candidacy_bans b
                 where b.user_id = p_user and b.lifted_at is null
                   and b.until_date >= (now() at time zone 'Asia/Riyadh')::date);
$$;
revoke execute on function public._is_candidacy_banned(uuid) from public, anon, authenticated;

create or replace function public.ban_from_candidacy(p_user uuid, p_reason text, p_until date)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_today  date := (now() at time zone 'Asia/Riyadh')::date;
  v_id     bigint;
  r        record;
begin
  if not exists (select 1 from user_roles where user_id = v_uid and is_active and role_name = 'club_president') then
    raise exception 'الحرمان من الترشّح لرئيس أدِيب وحده (المادة 11)' using errcode = '42501';
  end if;
  if p_user is null or not exists (select 1 from profiles where id = p_user) then raise exception 'العضو غير موجود'; end if;
  if v_reason is null or char_length(v_reason) < 10 then raise exception 'اكتب سبب الحرمان (10 أحرف على الأقلّ)'; end if;
  if p_until is null or p_until < v_today or p_until > (v_today + interval '1 year')::date then
    raise exception 'أجل الحرمان من اليوم إلى سنةٍ على الأكثر (المادة 11)';
  end if;
  if public._is_candidacy_banned(p_user) then raise exception 'هذا العضو محرومٌ من الترشّح الآن'; end if;
  insert into candidacy_bans (user_id, reason, until_date, issued_by) values (p_user, v_reason, p_until, v_uid)
  returning id into v_id;
  -- ينتهي به ما لم يُفتح تصويته من ترشّحه.
  for r in
    select ec.id from election_candidates ec join elections e on e.id = ec.election_id
    where ec.user_id = p_user and public._is_live_candidacy(ec.status)
      and e.archived_at is null and e.status in ('candidacy_open', 'candidacy_closed')
  loop
    perform public._end_candidacy(r.id, 'debarred', v_uid, jsonb_build_object('ban_id', v_id));
  end loop;
  perform public._send_election_notification(
    null, 'specific_users', 'حُرمتَ من الترشّح',
    'قرّر رئيس أدِيب حرمانك من الترشّح حتى ' || to_char(p_until, 'YYYY-MM-DD') || '. السبب: ' || v_reason
      || '. ولك أن تتظلّم منه كتابةً إلى الرئيسين.',
    'warning', 'high', array[p_user], jsonb_build_object('event', 'candidacy_banned', 'ban_id', v_id, 'until', p_until));
  return v_id;
end;
$$;
grant execute on function public.ban_from_candidacy(uuid, text, date) to authenticated;

create or replace function public.lift_candidacy_ban(p_ban bigint, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_b      candidacy_bans%rowtype;
begin
  if not exists (select 1 from user_roles where user_id = v_uid and is_active and role_name = 'club_president') then
    raise exception 'رفع الحرمان لرئيس أدِيب وحده (المادة 11)' using errcode = '42501';
  end if;
  select * into v_b from candidacy_bans where id = p_ban for update;
  if not found or v_b.lifted_at is not null then raise exception 'لا حرمان قائم هنا'; end if;
  if v_reason is null or char_length(v_reason) < 10 then raise exception 'اكتب سبب رفع الحرمان (10 أحرف على الأقلّ)'; end if;
  update candidacy_bans set lifted_at = now(), lifted_by = v_uid, lift_reason = v_reason where id = p_ban;
  perform public._send_election_notification(
    null, 'specific_users', 'رُفع حرمانك من الترشّح',
    'رفع رئيس أدِيب حرمانك من الترشّح. السبب: ' || v_reason || '.',
    'info', 'normal', array[v_b.user_id], jsonb_build_object('event', 'candidacy_ban_lifted', 'ban_id', p_ban));
end;
$$;
grant execute on function public.lift_candidacy_ban(bigint, text) to authenticated;

-- الأهليّة: المحروم لا يترشّح ولا يُرجَع ترشّحه ما دام حرمانه قائمًا.
do $patch$
declare
  d text := pg_get_functiondef('public._run_eligibility(uuid,uuid,boolean)'::regprocedure);
  a text := '    if not coalesce(check_user_permission(p_user, ''run_for_election''), false) then return false; end if;';
  b text := a || chr(10) || '    if public._is_candidacy_banned(p_user) then return false; end if;';
begin
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception '_run_eligibility: لم يقع الاستبدال'; end if;
  execute replace(d, a, b);
end
$patch$;
