-- ════════════════════════════════════════════════════════════════════════════════════════════
-- الدفعة الخامسة من إصلاح الانتخابات: نظام الإشعار الكامل (2026-11-17)
-- المرجع: نظام الانتخابات، المادة 7، وقرار محمد: «كلّ من يعنيه الأمر يُبلَّغ في المنصّة بالفتح،
-- والإغلاق، والتصويت، والإعلان، والإلغاء، وكلّ قرارٍ في ترشّحه». وطريقُ الإشعار: v2/NOTIFICATIONS-SYSTEM.md.
--
-- الفكرة: سجلّ الانتخاب (`election_audit_log`) يقيّد كلّ ما يجري، بفاعله وحقائقه. فصار هو مصدرَ
-- الإشعار الواحد: محفّزٌ على كلّ سطرٍ يُكتب فيه يحوّله إلى واقعة `election.*` في `notify_event`، ودليلُ
-- الإشعارات (`lib/notifications/catalog.ts`) يقرّر من يسمع وبأيّ نصّ. فلا يقع حدثٌ في الانتخاب يُقيَّد
-- ولا يُبلَّغ به من يعنيه، ولا يُبلَّغ بشيءٍ لم يقع.
--
-- ما تفعله:
--   (١) عناوين جديدة في `notification_recipients`: ناخبو المقعد، ومن يدير الانتخاب، ومرشّحوه،
--       ومن بطل صوته، ومن ينتظر إعادة التصويت، والمجلس الإداري (للتعادل).
--   (٢) المحفّز `election_audit_notify` على السجلّ.
--   (٣) `_send_election_notification` القديمة كانت تكتب في جدول `notifications` القديم فلا يصل شيء.
--       صارت لا تفعل شيئًا، إلا للحرمان ورفعه (لا انتخاب لهما في السجلّ) فتطلق واقعتهما.
--   (٤) محفّزا الإشعار القديمان على `election_candidates` يُسقَطان مع دالّتيهما: ما كانا يقولانه
--       يقوله السجلّ الآن.
--
-- لا يتّصل بخدمةٍ خارجيّة فورًا: الواقعة صفٌّ في `notification_events`، يوزّعه الموزّع بعد الختام.
-- ولا حقائقَ فيها تكشف من صوّت لمن: من بطل صوته يُعرف لحظة التوزيع من عنوانه، لا من الواقعة.
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- ── ١. العناوين ─────────────────────────────────────────────────────────────────────────────
do $patch$
declare
  d text := pg_get_functiondef('public.notification_recipients(jsonb)'::regprocedure);
  a text := '    else' || chr(10) || '      raise exception ''notification address: unknown shape %'', a;';
  b text := $b$    -- ── عناوين الانتخاب (الدفعة الخامسة، 2026-11-17) ──
    -- ناخبو المقعد: من في لجنته (أو في لجان قسمه لمنسّق القسم)، ومن يصوّت في كلّ انتخاب.
    elsif a ? 'electorate' then
      return query
        select ur.user_id from public.elections e
        join public.user_roles ur on ur.is_active
        where e.id = (a->>'electorate')::uuid
          and ((e.target_role_name = 'department_head'
                and ur.committee_id in (select c.id from public.committees c where c.department_id = e.target_department_id))
            or (e.target_role_name <> 'department_head' and ur.committee_id = e.target_committee_id))
        union
        select ur.user_id from public.user_roles ur join public.roles r on r.role_name = ur.role_name
        where ur.is_active and r.votes_in_all_elections;
    -- من يدير الانتخاب: مديرو الانتخابات، ومشرف اللجنة من الموارد البشرية لمقعد القائد ونائبه.
    elsif a ? 'election_managers' then
      return query
        select h from public.notification_capability_holders('manage_elections') h
        union
        select cs.supervisor_id from public.elections e
        join public.committee_supervision cs on cs.committee_id = e.target_committee_id
        join public.committees hr on hr.id = cs.unit_id and hr.member_role_name = 'hr_admin_member'
        join public.user_roles ur on ur.user_id = cs.supervisor_id and ur.is_active
                                 and ur.role_name = 'hr_admin_member' and ur.committee_id = hr.id
        where e.id = (a->>'election_managers')::uuid
          and e.target_role_name in ('committee_leader', 'deputy_committee_leader');
    -- مرشّحو الانتخاب القائمون.
    elsif a ? 'election_candidates' then
      return query
        select ec.user_id from public.election_candidates ec
        where ec.election_id = (a->>'election_candidates')::uuid
          and ec.status in ('pending', 'approved', 'needs_edit', 'frozen');
    -- من بطل صوته في لحظةٍ بعينها: يُعرف هنا لا في الواقعة، فلا تحمل الواقعةُ من صوّت لمن.
    elsif a ? 'voided_voters' then
      return query
        select distinct v.voter_id from public.election_votes v
        where v.election_id = (a->>'voided_voters')::uuid
          and v.void_reason = a->>'reason'
          and v.voided_at = (a->>'at')::timestamptz
          and (not a ? 'candidate' or v.candidate_id = (a->>'candidate')::uuid);
    -- من ينتظر إعادة التصويت المقصورة: بطل صوته بانتهاء ترشّح من صوّت له، ولم يصوّت بعد.
    elsif a ? 'revote_voters' then
      return query
        select distinct v.voter_id from public.election_votes v
        where v.election_id = (a->>'revote_voters')::uuid and v.void_reason = 'candidacy_ended'
          and not exists (select 1 from public.election_votes l
                          where l.election_id = v.election_id and l.voter_id = v.voter_id and l.voided_at is null);
    -- المجلس الإداري: مقاعده المشغولة، أصالةً أو تكليفًا (المادة 26).
    elsif a ? 'council' then
      return query select m from public._council_members() m;
    else
      raise exception 'notification address: unknown shape %', a;$b$;
begin
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then
    raise exception 'notification_recipients: لم يقع الاستبدال مرّةً واحدة';
  end if;
  execute replace(d, a, b);
end
$patch$;

-- ── ٢. السجلّ مصدر الإشعار ──────────────────────────────────────────────────────────────────
-- يحوّل نوعَ السطر إلى نوع الواقعة، ويضيف إلى حقائقه المقعدَ (رتبةً ووحدة) وصاحبَ الترشّح.
-- ويحذف منها ما لا يلزم النصّ: نتيجة الإسناد، ومن طلب التجميد (لا يعرفه المرشّح، المادة 5)،
-- وقوائم المتعادلين وأعداد ما حُفظ.
create or replace function public.election_audit_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p    jsonb := coalesce(new.payload, '{}'::jsonb);
  k    text;
  f    jsonb;
  v_e  elections%rowtype;
  v_u  uuid;
  v_nm text;
  v_g  text;
begin
  if new.election_id is null then return null; end if;

  k := case new.event_type
    when 'election_opened'           then 'opened'
    when 'deadline_changed'          then 'deadline_changed'
    when 'candidacy_reopened'        then 'candidacy_reopened'
    when 'status_transition'         then case p->>'new_status'
         when 'candidacy_closed' then 'candidacy_closed'
         when 'candidacy_open'   then 'candidacy_reopened'
         when 'voting_open'      then 'voting_opened'
         -- الإغلاق بموعده أو باكتمال الأصوات يتبعه الإعلانُ في الحال، فلا يُبلَّغ به وحده.
         -- والإغلاقُ قبل موعده بيد المدير يُبلَّغ بسببه (المادة 23).
         when 'voting_closed'    then case when coalesce((p->>'early')::boolean, false) then 'voting_closed_early' end
         end
    when 'winner_declared_auto'      then 'winner_declared'
    when 'cancelled'                 then 'cancelled'
    when 'election_stalled'          then 'stalled'
    when 'candidacy_stalled'         then 'stalled'
    when 'completed_by_appointment'  then 'appointed'
    when 'seat_appointed'            then 'acting_appointed'
    when 'tie_opened'                then 'tie_opened'
    when 'votes_voided'              then 'votes_voided'
    when 'revote_opened'             then 'revote_opened'
    when 'candidacy_submitted'       then 'candidacy_submitted'
    when 'candidate_resubmitted'     then 'candidacy_resubmitted'
    when 'candidate_reviewed'        then 'candidacy_reviewed'
    when 'candidate_withdrawn'       then 'candidacy_withdrawn'
    when 'candidate_restored'        then 'candidacy_restored'
    when 'candidacy_ended'           then 'candidacy_ended'
    when 'freeze_requested'          then 'freeze_requested'
    when 'candidate_frozen'          then 'candidacy_frozen'
    when 'freeze_answered'           then 'freeze_answered'
    when 'freeze_lifted'             then 'freeze_lifted'
    when 'candidacy_kept_after_move' then 'candidacy_kept'
    when 'resolve_failed'            then 'resolve_failed'
  end;
  if k is null then return null; end if;

  select * into v_e from elections where id = new.election_id;
  f := (p - 'assignment' - 'requested_by' - 'candidate_ids' - 'votes_preserved' - 'candidates_preserved' - 'files_preserved')
       || public._position_facts(v_e.target_role_name, v_e.target_committee_id, v_e.target_department_id)
       || jsonb_build_object('electionId', new.election_id, 'at', new.created_at);

  -- صاحبُ الترشّح، أو من عُيّن أو كُلّف: معرّفُه واسمُه وجنسُه، فيُخاطَب ويُذكَر لغيره.
  if p ? 'candidate_id' then
    select ec.user_id into v_u from election_candidates ec where ec.id = (p->>'candidate_id')::uuid;
  elsif p ? 'user_id' then
    v_u := (p->>'user_id')::uuid;
  end if;
  if v_u is not null then
    select pr.full_name, pr.gender into v_nm, v_g from profiles pr where pr.id = v_u;
    f := f || jsonb_build_object('userId', v_u, 'name', coalesce(v_nm, ''), 'female', v_g = 'female');
  end if;

  if k = 'votes_voided' then
    -- يحتاج المدير أن يفتح إعادة التصويت: إن لم يبقَ إلا مرشّحٌ واحد، أو بطلت الأصوات بعد الإغلاق.
    f := f || jsonb_build_object('needsRevote',
      p->>'reason' = 'single_left' or (p->>'reason' = 'candidacy_ended' and v_e.status = 'voting_closed'));
    -- ولا عدد: المجاميع لا تُرى قبل الإغلاق (المادة 5)، ومن يدير الانتخاب فيهم المشرف.
    f := f - 'count';
  elsif k = 'voting_opened' then
    f := f || jsonb_build_object('votingEnd', coalesce(p->>'voting_end', v_e.voting_end::text));
  elsif k = 'stalled' and new.event_type = 'candidacy_stalled' then
    f := f || jsonb_build_object('reason', 'no_live_after_close');
  end if;

  perform public.notify_event('election.' || k, f, new.actor_id);
  return null;
end;
$$;
revoke all on function public.election_audit_notify() from public, anon, authenticated;

create trigger election_audit_notify
  after insert on public.election_audit_log
  for each row execute function public.election_audit_notify();

-- ── ٣. الطريق القديم ────────────────────────────────────────────────────────────────────────
-- لا يفعل شيئًا: كلّ ما كان يُرسَل منه صار يُرسَل من السجلّ. إلا الحرمان ورفعه، فلا سطرَ لهما في سجلّ
-- انتخاب، فتُطلق واقعتهما من هنا بحقائقهما.
create or replace function public._send_election_notification(
  p_election_id uuid, p_audience text, p_title text, p_message text, p_type text default 'info',
  p_priority text default 'normal', p_user_ids uuid[] default null, p_metadata jsonb default '{}'::jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_metadata->>'event' in ('candidacy_banned', 'candidacy_ban_lifted') and cardinality(p_user_ids) = 1 then
    return public.notify_event('election.' || (p_metadata->>'event'),
                               (p_metadata - 'event') || jsonb_build_object('userId', p_user_ids[1]),
                               auth.uid())::integer;
  end if;
  return null;
end;
$$;
revoke all on function public._send_election_notification(uuid, text, text, text, text, text, uuid[], jsonb)
  from public, anon, authenticated;

-- والحرمانُ ورفعُه يحملان سببهما إلى الواقعة.
do $patch$
declare
  rep text[][] := array[
    array['public.ban_from_candidacy(uuid,text,date)',
          'jsonb_build_object(''event'', ''candidacy_banned'', ''ban_id'', v_id, ''until'', p_until)',
          'jsonb_build_object(''event'', ''candidacy_banned'', ''ban_id'', v_id, ''until'', p_until, ''reason'', v_reason)'],
    array['public.lift_candidacy_ban(bigint,text)',
          'jsonb_build_object(''event'', ''candidacy_ban_lifted'', ''ban_id'', p_ban)',
          'jsonb_build_object(''event'', ''candidacy_ban_lifted'', ''ban_id'', p_ban, ''reason'', v_reason)']];
  d text;
  i int;
begin
  for i in 1 .. 2 loop
    d := pg_get_functiondef(rep[i][1]::regprocedure);
    if (length(d) - length(replace(d, rep[i][2], ''))) / length(rep[i][2]) <> 1 then
      raise exception '%: لم يقع الاستبدال', rep[i][1];
    end if;
    execute replace(d, rep[i][2], rep[i][3]);
  end loop;
end
$patch$;

-- ── ٤. المحفّزان القديمان ───────────────────────────────────────────────────────────────────
drop trigger trg_notify_candidate_status_change on public.election_candidates;
drop trigger trg_notify_candidate_submitted on public.election_candidates;
drop function public.notify_candidate_status_change();
drop function public.notify_candidate_submitted();
