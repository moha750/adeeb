-- ════════════════════════════════════════════════════════════════════════════════════════════
-- الدفعة الثالثة من إصلاح الانتخابات: الفوز والتعادل والتعثّر والتعيين (2026-11-16)
-- المرجع: نظام الانتخابات، الإصدار الثاني، المواد 3 و8 و23 و25 إلى 29؛ والدستور، المادتان 12 و49.
--
-- ما تفعله:
--   ١. تُعلن المنصّةُ الفائزَ آليًّا لحظة إغلاق التصويت، أيًّا كان سبب الإغلاق: موعدُه، أو يدُ مديره،
--      أو تصويتُ الجميع. ولا يُعلنه أحدٌ بيده بعد اليوم (المادة 28)، فتسقط دالّتا الإعلان اليدويّ.
--   ٢. لا تنتظر المنصّة إلا ثلاثًا: تعادلًا يفصل فيه المجلس الإداري، أو مقعدًا مرتبطًا في القسم لم
--      يُغلق تصويته (المادة 27)، أو ترشّحًا مجمَّدًا (المادة 16). والمجمَّد ترشّحٌ قائم في الربط.
--   ٣. التعادل: يختار كلُّ عضو في المجلس الإداري بسببٍ مكتوب، أو يترك الاختيار للأسبق ترشّحًا. فمن
--      جمع أكثر من نصف المقاعد المشغولة في المجلس فاز في الحال، وإن اختاروا جميعًا وتعادلوا رجح
--      اختيار رئيس أدِيب، وإن مضت أربع وعشرون ساعة فاز الأسبق ترشّحًا آليًّا (المادة 26؛ قرار محمد
--      2026-11-16: الأغلبيّة من المقاعد المشغولة أصالةً أو تكليفًا).
--   ٤. التعثّر بعد الإغلاق: سقوط التزكية يُعثّر الانتخاب ولا يلغيه، وكذلك التنافسيّ الذي لم ينل فيه
--      أحد صوتًا، وما لم يبقَ فيه من يفوز بعد المادة 27 (المادة 25).
--   ٥. التعيين على المقعد المتعثّر، أو الذي أُلغي لتعثّره، يُكمل الانتخاب «بالتعيين»، وهو للمديرين
--      الثلاثة وحدهم. والتكليف عليه لا يلغي الانتخاب (المادتان 8 و25). ولا يُعيَّن ولا يُكلَّف من
--      سقطت تزكيته فيه.
--   ٦. الإلغاء بعد فتح التصويت لا يكون إلا لتعثّره أو لخللٍ يمسّ صحّته يُسمّى (المادة 29).
--
-- ما لا تفعله (الدفعة الرابعة): إبطال الأصوات وإعادة التصويت (المادة 16)، والتجميد أثناء التصويت،
-- وإعادة فتح الباب بعد التصويت (المادة 25)، والنقل «بطلبه» (المادة 17)، والحرمان (المادة 11).
-- والإشعارات الكاملة للخطوة الرابعة؛ وهنا إشعاران لا غنى عنهما: للمديرين بالتعثّر، وللمجلس بالتعادل.
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- ── ١. أعمدة الاكتمال والتعثّر ─────────────────────────────────────────────────────────────────
-- يكتمل الانتخاب بفائزٍ أو بتعيين (المادة 3)، ويُحفظ سببُ التعثّر ليُعرض ويُحرس به.
alter table public.elections
  add column completed_by      text,
  add column appointed_user_id uuid references public.profiles(id) on delete restrict,
  add column stall_reason      text;
alter table public.elections add constraint elections_completed_by_check
  check (completed_by is null or completed_by in ('winner', 'appointment'));
alter table public.elections add constraint elections_stall_reason_check
  check (stall_reason is null or stall_reason in
         ('no_candidates', 'no_live_after_close', 'confidence_failed', 'no_votes', 'none_left_after_27'));
-- ما اكتمل قبل اليوم اكتمل بفائز.
update public.elections set completed_by = 'winner' where status = 'completed' and winner_candidate_id is not null;

-- ── ٢. المجلس الإداري ──────────────────────────────────────────────────────────────────────────
-- أعضاؤه بنصّ الدستور (المادة 12): رئيس أدِيب، والرئيس التنفيذي، وقادة الإدارات الثلاث. والرئيس
-- التنفيذي يقود الإدارة التنفيذية بمقعده. ومن جمع مقعدين فيه فله صوتٌ واحد (الدستور، المادة 33)،
-- فيُعدّ الأشخاص لا الصفوف. والمكلَّف عضوٌ مدّة تكليفه.
create or replace function public._council_members()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct ur.user_id from user_roles ur
  where ur.is_active
    and ur.role_name in ('club_president', 'executive_council_president', 'hr_committee_leader', 'qa_committee_leader');
$$;
revoke execute on function public._council_members() from public, anon, authenticated;

create or replace function public._is_council_member(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user is not null and exists (select 1 from public._council_members() m where m = p_user);
$$;
-- يُستدعى من سياسة القراءة على جدولَي التعادل، فيلزمه الإذن لمن تجري عليه السياسة.
revoke execute on function public._is_council_member(uuid) from public, anon;
grant execute on function public._is_council_member(uuid) to authenticated;

-- ── ٣. التعادل وما يختاره المجلس ────────────────────────────────────────────────────────────────
create table public.election_ties (
  id                  bigserial primary key,
  election_id         uuid not null references public.elections(id) on delete restrict,
  candidate_ids       uuid[] not null check (cardinality(candidate_ids) >= 2),
  opened_at           timestamptz not null default now(),
  due_at              timestamptz not null,
  status              text not null default 'open' check (status in ('open', 'decided', 'void')),
  outcome             text check (outcome in ('majority', 'president', 'earliest')),
  winner_candidate_id uuid references public.election_candidates(id) on delete restrict,
  decided_at          timestamptz,
  void_reason         text
);
create unique index election_ties_one_open on public.election_ties (election_id) where status = 'open';

create table public.election_tie_choices (
  id           bigserial primary key,
  tie_id       bigint not null references public.election_ties(id) on delete restrict,
  member_id    uuid not null references public.profiles(id) on delete restrict,
  -- فارغٌ = ترك الاختيار للأسبق ترشّحًا (المادة 26).
  candidate_id uuid references public.election_candidates(id) on delete restrict,
  reason       text not null check (char_length(btrim(reason)) >= 10),
  chosen_at    timestamptz not null default now(),
  unique (tie_id, member_id)
);

alter table public.election_ties enable row level security;
alter table public.election_tie_choices enable row level security;
revoke all on public.election_ties, public.election_tie_choices from anon, authenticated;
revoke all on sequence public.election_ties_id_seq, public.election_tie_choices_id_seq from anon, authenticated;
grant select on public.election_ties, public.election_tie_choices to authenticated;
create policy election_ties_select on public.election_ties for select to authenticated
  using (public._is_council_member((select auth.uid())) or public.has_election_admin_permission((select auth.uid())));
create policy election_tie_choices_select on public.election_tie_choices for select to authenticated
  using (public._is_council_member((select auth.uid())) or public.has_election_admin_permission((select auth.uid())));
create trigger election_ties_no_delete before delete on public.election_ties
  for each row execute function public.forbid_election_delete();
create trigger election_ties_no_truncate before truncate on public.election_ties
  for each statement execute function public.forbid_election_delete();
create trigger election_tie_choices_no_delete before delete on public.election_tie_choices
  for each row execute function public.forbid_election_delete();
create trigger election_tie_choices_no_truncate before truncate on public.election_tie_choices
  for each statement execute function public.forbid_election_delete();

-- ── ٤. الإسناد بيد المنصّة ──────────────────────────────────────────────────────────────────────
-- `assign_position` يسأل عن سلطة المُسنِد في كلّ خطوة، والفائز يُسنَد إليه المقعد بحكم النظام لا بيد
-- أحد (المادة 28). فيُفتح له بابٌ واحد: فاعلٌ فارغ مع علامة الجلسة `app.election_gate`، ولا يرفعها إلا
-- محفّز إعلان الفائز في القاعدة. ولا يبلغها عميل: لا تُضبط إعدادات الجلسة من الواجهة.
-- يُعدَّل النصّ الحيّ بالاستبدال، ويُتحقَّق من وقوع كلّ استبدالٍ مرّةً واحدة، فلا يُنسخ هنا 15 ألف حرف.
do $patch$
declare
  d   text := pg_get_functiondef('public.assign_position(uuid,uuid,text,integer,integer,boolean,text)'::regprocedure);
  rep text[][] := array[
    array['  v_was_live             boolean;' || chr(10) || 'begin',
          '  v_was_live             boolean;' || chr(10)
          || '  -- إسنادٌ بحكم النظام: فائزٌ تعلنه المنصّة (نظام الانتخابات، المادة 28). فاعله فارغ.' || chr(10)
          || '  v_sys                  boolean := p_actor is null and coalesce(current_setting(''app.election_gate'', true), '''') = ''open'';' || chr(10)
          || 'begin'],
    array['  if coalesce(current_setting(''app.gift_gate'', true), '''') <> ''open'' and not exists (',
          '  if not v_sys and coalesce(current_setting(''app.gift_gate'', true), '''') <> ''open'' and not exists ('],
    array['  if not can_assign_role(p_actor, v_role_name, p_committee) then',
          '  if not v_sys and not can_assign_role(p_actor, v_role_name, p_committee) then'],
    array['  if not can_take_position_from(p_actor, p_user)',
          '  if not v_sys and not can_take_position_from(p_actor, p_user)'],
    array['  where ur.user_id = p_user and ur.is_active and not ur.is_acting' || chr(10) || '    and ur.role_name <> ''committee_member''',
          '  where not v_sys and ur.user_id = p_user and ur.is_active and not ur.is_acting' || chr(10) || '    and ur.role_name <> ''committee_member'''],
    array['  if v_existing_id is not null and p_replace and coalesce(v_needs_cp, false) and not is_club_president(p_actor) then',
          '  if not v_sys and v_existing_id is not null and p_replace and coalesce(v_needs_cp, false) and not is_club_president(p_actor) then']
  ];
  i int;
begin
  for i in 1 .. array_length(rep, 1) loop
    if (length(d) - length(replace(d, rep[i][1], ''))) / length(rep[i][1]) <> 1 then
      raise exception 'assign_position: لم يقع الاستبدال % مرّةً واحدة؛ تغيّرت الدالّة، فراجعها قبل التطبيق', i;
    end if;
    d := replace(d, rep[i][1], rep[i][2]);
  end loop;
  execute d;
end
$patch$;

-- ── ٥. حرّاس جدول الانتخابات ────────────────────────────────────────────────────────────────────
-- الانتقالات: ويكتمل الانتخاب بالتعيين من مرحلة تعثّره، أو بعد إلغائه لتعثّره (المادتان 3 و25).
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

-- حارس الفائز: كما كان، إلا أنّه لم يعد يكتب الجلسة فاعلًا. فالمنصّة تُعلن، وقد يقع الإعلان في
-- بطاقة ناخبٍ أكمل النصاب (المادة 23)، فلو كُتب الناخب مُعلنًا لصار هو من أسند المقعد.
create or replace function public.enforce_winner_declaration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cand        election_candidates%rowtype;
  v_dept        integer;
  v_top_weight  numeric;
  v_this_weight numeric;
  v_no_weight   numeric;
begin
  if new.winner_candidate_id is null then return new; end if;
  if old.winner_candidate_id is not distinct from new.winner_candidate_id then return new; end if;
  if old.winner_candidate_id is not null and new.status <> 'cancelled' then
    raise exception 'لا يمكن تغيير الفائز بعد إعلانه';
  end if;

  select * into v_cand from election_candidates where id = new.winner_candidate_id;
  if not found or v_cand.election_id <> new.id or v_cand.status <> 'approved' then
    raise exception 'الفائز المقترح ليس مرشحاً معتمداً في هذا الانتخاب';
  end if;
  if new.status not in ('voting_closed', 'completed') then
    raise exception 'لا يمكن إعلان الفائز إلا بعد إغلاق التصويت';
  end if;

  if public.is_confidence_election(new.id) then
    v_this_weight := public._choice_weight(new.id, 'approve');
    v_no_weight   := public._choice_weight(new.id, 'reject');
    if not (v_this_weight > v_no_weight) then
      raise exception 'سقطت التزكية: لم يغلب التأييدُ الاعتراض';
    end if;
    new.winner_declared_at := coalesce(new.winner_declared_at, now());
    return new;
  end if;

  v_dept := coalesce(new.target_department_id,
                     (select c.department_id from committees c where c.id = new.target_committee_id));

  if exists (
    select 1 from elections e2
    join election_candidates ec2 on ec2.id = e2.winner_candidate_id
    where e2.id <> new.id and election_department(e2.id) = v_dept and e2.status = 'completed'
      and e2.winner_declared_at >= new.candidacy_opened_at and ec2.user_id = v_cand.user_id
  ) then
    raise exception 'هذا العضو فائزٌ بمقعدٍ آخر في هذا القسم؛ يفوز هنا من يليه (المادة 27).';
  end if;

  select coalesce(sum(ev.vote_weight), 0) into v_top_weight
  from election_votes ev
  where ev.election_id = new.id and ev.vote_choice = 'approve'
    and not exists (
      select 1 from elections e2
      join election_candidates ec2 on ec2.id = e2.winner_candidate_id
      join election_candidates ecx on ecx.id = ev.candidate_id
      where e2.id <> new.id and election_department(e2.id) = v_dept and e2.status = 'completed'
        and e2.winner_declared_at >= new.candidacy_opened_at and ec2.user_id = ecx.user_id)
  group by ev.candidate_id
  order by coalesce(sum(ev.vote_weight), 0) desc
  limit 1;

  select coalesce(sum(vote_weight), 0) into v_this_weight
  from election_votes
  where election_id = new.id and candidate_id = new.winner_candidate_id and vote_choice = 'approve';

  if coalesce(v_top_weight, 0) > coalesce(v_this_weight, 0) then
    raise exception 'الفائز المعلن ليس صاحب أعلى الأصوات';
  end if;
  if coalesce(v_this_weight, 0) <= 0 then
    raise exception 'لا يفوز في الانتخاب التنافسيّ من لم ينل صوتًا (المادة 26)';
  end if;

  new.winner_declared_at := coalesce(new.winner_declared_at, now());
  return new;
end;
$$;

-- الإسناد عند الاكتمال بفائز. والاكتمال بالتعيين أسند صاحبَه قبله، فلا يُسنَد مرّتين.
create or replace function public.auto_grant_winner_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winner_user uuid;
  v_result      jsonb;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;
  if new.completed_by = 'appointment' then return new; end if;

  select user_id into v_winner_user from election_candidates where id = new.winner_candidate_id;
  if v_winner_user is null then
    raise exception 'auto_grant_winner_role: لا فائزَ مرتبطٌ بهذا الانتخاب';
  end if;

  -- المنصّة تُسند بحكم النظام (المادة 28)، والفاعل فارغ.
  if new.winner_declared_by is null then
    perform set_config('app.election_gate', 'open', true);
  end if;
  v_result := assign_position(
    p_actor      => new.winner_declared_by,
    p_user       => v_winner_user,
    p_role_name  => new.target_role_name,
    p_committee  => new.target_committee_id,
    p_department => new.target_department_id,
    p_replace    => true,
    p_notes      => 'إسنادٌ بالفوز في الانتخاب ' || new.id::text
  );
  perform set_config('app.election_gate', '', true);

  if not coalesce((v_result->>'ok')::boolean, false) then
    raise exception 'تعذّر إسناد منصب الفائز: %', coalesce(v_result->>'message', 'خطأ غير معروف');
  end if;

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (new.id, new.winner_declared_by, 'winner_declared',
          jsonb_build_object('winner_user_id', v_winner_user, 'role_name', new.target_role_name, 'assignment', v_result));
  return new;
end;
$$;

-- ── ٦. التعثّر والإعلان ────────────────────────────────────────────────────────────────────────
create or replace function public._stall_election(p_election uuid, p_reason text, p_payload jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ar text := case p_reason
    when 'no_candidates'      then 'حلّ موعد إغلاق الترشّح ولا ترشّح قائم فيه'
    when 'no_live_after_close' then 'لم يبقَ ترشّح قائم بعد إغلاق الباب'
    when 'confidence_failed'  then 'سقطت التزكية'
    when 'no_votes'           then 'أُغلق التصويت ولم ينل أحدٌ صوتًا'
    when 'none_left_after_27' then 'لم يبقَ من يفوز بعد حسم مقاعد القسم'
    else p_reason end;
begin
  update elections set stalled_at = now(), stall_reason = p_reason
   where id = p_election and stalled_at is null;
  if not found then return; end if;
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (p_election, null, 'election_stalled', jsonb_build_object('reason', p_reason) || coalesce(p_payload, '{}'::jsonb));
  perform public._send_election_notification(
    p_election, 'election_admins', 'انتخابٌ متعثّر ينتظر قرارك',
    'تعثّر انتخاب ' || public._election_target_label(p_election) || ': ' || v_ar
      || '. اختر: إعادة فتح الباب بموعدٍ جديد، أو التعيين، أو الإلغاء (المادة 25).',
    'warning', 'high', null,
    jsonb_build_object('event', 'election_stalled', 'reason', p_reason) || coalesce(p_payload, '{}'::jsonb));
end;
$$;
revoke execute on function public._stall_election(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public._declare_seat(p_election uuid, p_candidate uuid, p_how text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update elections
     set winner_candidate_id = p_candidate,
         winner_declared_by  = null,
         winner_declared_at  = now(),
         status              = 'completed',
         completed_by        = 'winner',
         archived_at         = now()
   where id = p_election and status = 'voting_closed' and winner_candidate_id is null;
  if not found then
    raise exception 'لا يُعلن فائزٌ إلا في انتخابٍ أُغلق تصويته ولم يُعلَن';
  end if;
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (p_election, null, 'winner_declared_auto', jsonb_build_object('candidate_id', p_candidate, 'how', p_how));
  perform public._send_election_notification(
    p_election, 'election_participants', 'أُعلن الفائز',
    'أعلنت المنصّة فائز ' || public._election_target_label(p_election) || '.',
    'success', 'normal', null,
    jsonb_build_object('event', 'winner_declared', 'candidate_id', p_candidate));
end;
$$;
revoke execute on function public._declare_seat(uuid, uuid, text) from public, anon, authenticated;

create or replace function public._open_tie(p_election uuid, p_candidates uuid[])
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id      bigint;
  v_members uuid[] := array(select public._council_members());
begin
  insert into election_ties (election_id, candidate_ids, due_at)
  values (p_election, p_candidates, now() + interval '24 hours')
  returning id into v_id;
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (p_election, null, 'tie_opened',
          jsonb_build_object('tie_id', v_id, 'candidate_ids', to_jsonb(p_candidates), 'due_at', now() + interval '24 hours',
                             'council_size', cardinality(v_members)));
  if cardinality(v_members) > 0 then
    perform public._send_election_notification(
      p_election, 'specific_users', 'تعادلٌ ينتظر قرار المجلس',
      'تعادل المتصدّرون في ' || public._election_target_label(p_election)
        || '. اختر الفائز بسببٍ مكتوب خلال أربع وعشرين ساعة، وإلا فاز الأسبق ترشّحًا (المادة 26).',
      'warning', 'urgent', v_members,
      jsonb_build_object('event', 'tie_opened', 'tie_id', v_id, 'due_at', now() + interval '24 hours'));
  end if;
  return v_id;
end;
$$;
revoke execute on function public._open_tie(uuid, uuid[]) from public, anon, authenticated;

-- ── ٧. حسم مقاعد القسم (المواد 26 و27 و28) ─────────────────────────────────────────────────────
-- يُستدعى بإغلاق أيّ تصويت، وبإلغاء انتخابٍ أو اكتماله بالتعيين، وتُعيده الكنّاسة كلّ دقيقة لما بقي.
-- يأخذ مقاعد القسم التي أُغلق تصويتها ولم تُعلَن ولم تتعثّر ولا تعادل فيها، ثمّ:
--   أ. يحجز منها ما فيه مجمَّد، وما يخوض أحدُ مرشّحيه مقعدًا آخر في القسم لم يُغلق تصويته ولم يتعثّر،
--      وما شارك مقعدًا محجوزًا مرشّحًا (فالحسم معًا)؛
--   ب. يُعثّر التزكية الساقطة؛
--   ج. من تصدّر وحده أكثر من مقعد احتفظ بمفضَّله، فإن لم يعيّن فبأعلاها، فإن تساوت فبأسبقهما ترشّحًا،
--      وخرج من الباقي، وانتهى ترشّحه في التزكية؛
--   د. يُعلن المتصدّر الوحيد بعد إخراج من فاز في القسم في الدورة، ويُؤخّر المتعادلين حتى يُعلن ما
--      سواهم، ثمّ يفتح لهم التعادل؛ ومن لم يبقَ فيه من نال صوتًا تعثّر.
create or replace function public._resolve_department(p_election uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dept  integer := public.election_department(p_election);
  v_user  uuid;
  v_keep  uuid;
  v_e     uuid;
  v_top   numeric;
  v_n     integer;
  v_win   uuid;
  v_order uuid[] := '{}';
  v_tied  uuid[] := '{}';
  v_out   jsonb := '[]'::jsonb;
  r       record;
begin
  drop table if exists pg_temp._rs_seats;
  drop table if exists pg_temp._rs_c;

  create temp table _rs_seats on commit drop as
    select e.id, e.target_role_name, e.candidacy_opened_at, false as conf, false as blocked
    from elections e
    where e.status = 'voting_closed' and e.archived_at is null and e.winner_candidate_id is null and e.stalled_at is null
      and not exists (select 1 from election_ties t where t.election_id = e.id and t.status = 'open')
      and (e.id = p_election or (v_dept is not null and public.election_department(e.id) = v_dept));
  if not exists (select 1 from _rs_seats) then
    return jsonb_build_object('ok', true, 'seats', '[]'::jsonb);
  end if;
  update _rs_seats set conf = public.is_confidence_election(id);

  -- أ. الحجز.
  update _rs_seats s set blocked = true
   where exists (select 1 from election_candidates ec where ec.election_id = s.id and ec.status = 'frozen');
  update _rs_seats s set blocked = true
   where exists (
     select 1 from election_candidates a
     join election_candidates b on b.user_id = a.user_id and b.election_id <> a.election_id
     join elections e2 on e2.id = b.election_id
     where a.election_id = s.id and a.status in ('approved', 'frozen') and public._is_live_candidacy(b.status)
       and e2.archived_at is null and e2.stalled_at is null
       and e2.status in ('candidacy_open', 'candidacy_closed', 'voting_open')
       and public.election_department(e2.id) = v_dept);
  loop
    update _rs_seats s set blocked = true
     where not s.blocked and exists (
       select 1 from election_candidates a
       join election_candidates b on b.user_id = a.user_id and b.election_id <> a.election_id
       join _rs_seats s2 on s2.id = b.election_id and s2.blocked
       where a.election_id = s.id and a.status = 'approved' and b.status in ('approved', 'frozen'));
    exit when not found;
  end loop;
  delete from _rs_seats where blocked;

  -- ب. التزكية الساقطة تتعثّر، ويُقيَّد وزنا التأييد والاعتراض (المادة 25).
  for r in select id from _rs_seats where conf loop
    if public._choice_weight(r.id, 'approve') <= public._choice_weight(r.id, 'reject') then
      perform public._stall_election(r.id, 'confidence_failed',
        jsonb_build_object('approve_weight', public._choice_weight(r.id, 'approve'),
                           'reject_weight',  public._choice_weight(r.id, 'reject')));
      delete from _rs_seats where id = r.id;
    end if;
  end loop;

  create temp table _rs_c on commit drop as
    select ec.election_id as eid, ec.id as cid, ec.user_id as uid,
           coalesce(ec.preference_rank, 2) as pref, ec.submitted_at as sub,
           coalesce((select sum(v.vote_weight) from election_votes v
                     where v.candidate_id = ec.id and v.vote_choice = 'approve'), 0) as w,
           case s.target_role_name when 'department_head' then 1 when 'committee_leader' then 2 else 3 end as rk,
           s.conf, false as dropped
    from election_candidates ec
    join _rs_seats s on s.id = ec.election_id
    where ec.status = 'approved';

  -- ج. المادة 27 على المتصدّرين وحدهم.
  loop
    v_user := null;
    select t.uid into v_user
    from (
      select c.eid, c.uid from _rs_c c
      where not c.dropped and c.w > 0
        and c.w = (select max(c2.w) from _rs_c c2 where c2.eid = c.eid and not c2.dropped)
        and (select count(*) from _rs_c c3 where c3.eid = c.eid and not c3.dropped and c3.w = c.w) = 1
    ) t
    group by t.uid having count(*) > 1
    limit 1;
    exit when v_user is null;

    select c.eid into v_keep from _rs_c c
    where c.uid = v_user and not c.dropped and c.w > 0
      and c.w = (select max(c2.w) from _rs_c c2 where c2.eid = c.eid and not c2.dropped)
      and (select count(*) from _rs_c c3 where c3.eid = c.eid and not c3.dropped and c3.w = c.w) = 1
    order by c.pref, c.rk, c.sub
    limit 1;

    for r in select cid, eid from _rs_c where uid = v_user and eid <> v_keep and conf and not dropped loop
      perform public._end_candidacy(r.cid, 'kept_other_seat', null, jsonb_build_object('kept_election', v_keep));
    end loop;
    update _rs_c set dropped = true where uid = v_user and eid <> v_keep;
    v_order := v_order || v_keep;
  end loop;

  select v_order || coalesce(array_agg(s.id order by
           case s.target_role_name when 'department_head' then 1 when 'committee_leader' then 2 else 3 end, s.id), '{}')
    into v_order
  from _rs_seats s where not (s.id = any(v_order));

  -- د. الإعلان، ثمّ التعادل.
  for i in 1 .. 2 loop
    foreach v_e in array case when i = 1 then v_order else v_tied end loop
      update _rs_c c set dropped = true
       where c.eid = v_e and not c.dropped and exists (
         select 1 from elections e2
         join election_candidates w on w.id = e2.winner_candidate_id
         join _rs_seats me on me.id = v_e
         where e2.id <> v_e and e2.status = 'completed' and e2.winner_candidate_id is not null
           and public.election_department(e2.id) = v_dept
           and e2.winner_declared_at >= me.candidacy_opened_at and w.user_id = c.uid);

      select max(w) into v_top from _rs_c where eid = v_e and not dropped;
      select count(*) into v_n from _rs_c where eid = v_e and not dropped and w = v_top;

      if coalesce(v_top, 0) <= 0 then
        perform public._stall_election(v_e,
          case when exists (select 1 from _rs_c where eid = v_e and w > 0) then 'none_left_after_27' else 'no_votes' end);
        v_out := v_out || jsonb_build_array(jsonb_build_object('election', v_e, 'result', 'stalled'));
      elsif v_n = 1 then
        select cid into v_win from _rs_c where eid = v_e and not dropped and w = v_top;
        perform public._declare_seat(v_e, v_win, case when exists (
          select 1 from _rs_c where eid = v_e and dropped and w > v_top) then 'after_27' else 'top' end);
        v_out := v_out || jsonb_build_array(jsonb_build_object('election', v_e, 'result', 'declared', 'winner', v_win));
      elsif i = 1 then
        v_tied := v_tied || v_e;
      else
        perform public._open_tie(v_e, array(select cid from _rs_c where eid = v_e and not dropped and w = v_top order by sub, cid));
        v_out := v_out || jsonb_build_array(jsonb_build_object('election', v_e, 'result', 'tie'));
      end if;
    end loop;
  end loop;

  return jsonb_build_object('ok', true, 'seats', v_out);
end;
$$;
revoke execute on function public._resolve_department(uuid) from public, anon, authenticated;

-- ما يجري بعد كلّ إغلاقٍ للتصويت. ولا يُفسد إغلاقَ التصويت خطأٌ في الحسم: يُقيَّد ويُعيده الكنّاس.
create or replace function public._after_voting_closed(p_election uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public._resolve_department(p_election);
  exception when others then
    insert into election_audit_log (election_id, actor_id, event_type, payload)
    values (p_election, null, 'resolve_failed', jsonb_build_object('error', sqlerrm));
  end;
end;
$$;
revoke execute on function public._after_voting_closed(uuid) from public, anon, authenticated;

-- ── ٨. التعادل: الاختيار والحسم ────────────────────────────────────────────────────────────────
create or replace function public._settle_tie(p_tie bigint, p_candidate uuid, p_outcome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t election_ties%rowtype;
begin
  select * into v_t from election_ties where id = p_tie for update;
  if v_t.status <> 'open' then return; end if;
  update election_ties
     set status = 'decided', outcome = p_outcome, winner_candidate_id = p_candidate, decided_at = now()
   where id = p_tie;
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_t.election_id, null, 'tie_decided',
          jsonb_build_object('tie_id', p_tie, 'outcome', p_outcome, 'candidate_id', p_candidate));
  perform public._declare_seat(v_t.election_id, p_candidate, 'tie_' || p_outcome);
end;
$$;
revoke execute on function public._settle_tie(bigint, uuid, text) from public, anon, authenticated;

create or replace function public._tie_earliest(p_tie bigint)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ec.id from election_ties t
  join election_candidates ec on ec.id = any(t.candidate_ids) and ec.status = 'approved'
  where t.id = p_tie
  order by ec.submitted_at, ec.id
  limit 1;
$$;
revoke execute on function public._tie_earliest(bigint) from public, anon, authenticated;

create or replace function public._evaluate_tie(p_tie bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_size     integer;
  v_chosen   integer;
  v_earliest uuid := public._tie_earliest(p_tie);
  v_best     uuid;
  v_top      integer;
  v_ntop     integer;
  v_pres     uuid;
begin
  select count(*) into v_size from public._council_members();
  if v_size = 0 then return; end if;

  drop table if exists pg_temp._tie_eff;
  create temp table _tie_eff on commit drop as
    select c.member_id, coalesce(c.candidate_id, v_earliest) as cand
    from election_tie_choices c
    where c.tie_id = p_tie and c.member_id in (select public._council_members());

  select count(*) into v_chosen from _tie_eff;
  select cand, count(*) into v_best, v_top from _tie_eff group by cand order by count(*) desc limit 1;
  if v_best is null then return; end if;
  select count(*) into v_ntop from (select cand from _tie_eff group by cand having count(*) = v_top) x;

  -- أكثر من نصف أعضاء المجلس: يفوز في الحال.
  if v_top * 2 > v_size then
    perform public._settle_tie(p_tie, v_best, 'majority');
    return;
  end if;

  -- اختاروا جميعًا وتعادلوا: يرجح اختيار رئيس أدِيب إن كان بين المتعادلين في الأعلى.
  if v_chosen >= v_size and v_ntop > 1 then
    select e.cand into v_pres from _tie_eff e
    join user_roles ur on ur.user_id = e.member_id and ur.is_active and ur.role_name = 'club_president'
    limit 1;
    if v_pres is not null and (select count(*) from _tie_eff where cand = v_pres) = v_top then
      perform public._settle_tie(p_tie, v_pres, 'president');
    end if;
  end if;
end;
$$;
revoke execute on function public._evaluate_tie(bigint) from public, anon, authenticated;

-- اختيار عضو المجلس: مرشّحٌ من المتعادلين، أو فارغٌ يترك الاختيار للأسبق ترشّحًا. وسببٌ مكتوب
-- في الحالين، ولا يُعدَّل الاختيار بعد إرساله.
create or replace function public.choose_in_tie(p_tie bigint, p_candidate uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_t      election_ties%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public._is_council_member(v_uid) then
    raise exception 'الفصل في التعادل للمجلس الإداري (المادة 26)' using errcode = '42501';
  end if;
  select * into v_t from election_ties where id = p_tie for update;
  if not found or v_t.status <> 'open' then raise exception 'لا تعادل قائم هنا'; end if;
  if v_t.due_at <= now() then raise exception 'مضى أجل الفصل، ويفوز الأسبق ترشّحًا آليًّا'; end if;
  if p_candidate is not null and not (p_candidate = any(v_t.candidate_ids)) then
    raise exception 'اختر من المتعادلين';
  end if;
  if v_reason is null or char_length(v_reason) < 10 then
    raise exception 'اكتب سبب اختيارك (10 أحرف على الأقلّ)';
  end if;
  if exists (select 1 from election_tie_choices where tie_id = p_tie and member_id = v_uid) then
    raise exception 'اخترتَ في هذا التعادل من قبل، ولا يُعدَّل الاختيار';
  end if;
  insert into election_tie_choices (tie_id, member_id, candidate_id, reason) values (p_tie, v_uid, p_candidate, v_reason);
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_t.election_id, v_uid, 'tie_choice',
          jsonb_build_object('tie_id', p_tie, 'candidate_id', p_candidate, 'deferred', p_candidate is null, 'reason', v_reason));
  perform public._evaluate_tie(p_tie);
end;
$$;
grant execute on function public.choose_in_tie(bigint, uuid, text) to authenticated;

-- ما يُعرض على المجلس ومديري الانتخابات من التعادل: المتعادلون بأسمائهم وأسبقيّتهم، وما اختاره كلّ
-- عضو وسببه. ولا أوزان: يكفي المجلسَ أنّهم تعادلوا.
create or replace function public.get_election_tie(p_election uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_t   election_ties%rowtype;
begin
  if not (public._is_council_member(v_uid) or public.has_election_admin_permission(v_uid)) then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;
  select * into v_t from election_ties where election_id = p_election order by opened_at desc limit 1;
  if not found then return null; end if;
  return jsonb_build_object(
    'tie_id', v_t.id, 'status', v_t.status, 'outcome', v_t.outcome, 'due_at', v_t.due_at,
    'winner_candidate_id', v_t.winner_candidate_id,
    'council_size', (select count(*) from public._council_members()),
    'is_member', public._is_council_member(v_uid),
    'candidates', (select jsonb_agg(jsonb_build_object('candidate_id', ec.id, 'full_name', p.full_name,
                                                       'avatar_url', p.avatar_url, 'submitted_at', ec.submitted_at)
                                    order by ec.submitted_at, ec.id)
                   from election_candidates ec left join profiles p on p.id = ec.user_id
                   where ec.id = any(v_t.candidate_ids)),
    'choices', (select jsonb_agg(jsonb_build_object('member', p.full_name, 'candidate_id', c.candidate_id,
                                                    'reason', c.reason, 'chosen_at', c.chosen_at, 'is_me', c.member_id = v_uid)
                                 order by c.chosen_at)
                from election_tie_choices c left join profiles p on p.id = c.member_id
                where c.tie_id = v_t.id));
end;
$$;
grant execute on function public.get_election_tie(uuid) to authenticated;

-- ── ٩. الإغلاق حين يصوّت الجميع (المادة 23) ─────────────────────────────────────────────────────
-- من يجوز له التصويت في الانتخاب الآن: أهل نطاقه، ومن يصوّت في كلّ انتخاب، بلا المرشّح في التزكية.
create or replace function public._election_electorate(p_election uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select x.u from (
    select ur.user_id as u
    from elections e join user_roles ur on ur.is_active
    where e.id = p_election
      and ((e.target_role_name = 'department_head'
            and ur.committee_id in (select c.id from committees c where c.department_id = e.target_department_id))
        or (e.target_role_name <> 'department_head' and ur.committee_id = e.target_committee_id))
    union
    select ur.user_id from user_roles ur join roles r on r.role_name = ur.role_name
    where ur.is_active and r.votes_in_all_elections
  ) x
  where public.is_user_eligible_to_vote(x.u, p_election)
    and not public.is_sole_candidate(x.u, p_election);
$$;
revoke execute on function public._election_electorate(uuid) from public, anon, authenticated;

create or replace function public.close_voting_on_full_turnout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from elections where id = new.election_id for update;
  if v_status <> 'voting_open' then return new; end if;
  if exists (
    select 1 from public._election_electorate(new.election_id) u
    where not exists (select 1 from election_votes v where v.election_id = new.election_id and v.voter_id = u)
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
create trigger votes_full_turnout after insert on public.election_votes
  for each row execute function public.close_voting_on_full_turnout();

-- ── ١٠. إغلاق التصويت بيد المدير يُعلن كذلك ────────────────────────────────────────────────────
-- كما في الدفعة الأولى، إلا أنّ ما بعد الإغلاق صار حسمًا كاملًا لا فحص التزكية وحده.
create or replace function public.transition_election(
  p_election uuid,
  p_new_status text,
  p_voting_end timestamptz default null,
  p_reason text default null,
  p_candidacy_end timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_cur    text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_early  boolean := false;
  v_e      elections%rowtype;
begin
  if not public._can_manage_election(v_uid, p_election) then
    raise exception 'غير مصرح بتغيير حالة الانتخاب' using errcode = '42501';
  end if;
  select * into v_e from elections where id = p_election for update;
  if not found then raise exception 'الانتخاب غير موجود'; end if;
  v_cur := v_e.status;
  if p_new_status = 'cancelled' then
    raise exception 'الإلغاءُ بقرارٍ مكتوب بسببه من بابه (المادة 29)';
  elsif p_new_status = 'completed' then
    raise exception 'يكتمل الانتخاب بإعلان المنصّة فائزه أو بالتعيين، لا بتغيير حالته';
  end if;
  if v_cur = 'candidacy_open' and p_new_status = 'candidacy_closed' then
    if public._count_active_candidates(p_election) < 1 then
      raise exception 'لا يُغلق باب الترشّح وليس فيه ترشّح قائم (المادة 24)' using errcode = 'check_violation';
    end if;
    if v_reason is null or char_length(v_reason) < 10 then
      raise exception 'اكتب سبب إغلاق الباب قبل موعده (10 أحرف على الأقلّ)، فيُبلَّغ به ناخبو المقعد (المادة 23)';
    end if;
    v_early := v_e.candidacy_end is not null and v_e.candidacy_end > now();
    update elections set status = 'candidacy_closed' where id = p_election;
  elsif v_cur = 'candidacy_closed' and p_new_status = 'candidacy_open' then
    if p_candidacy_end is null or p_candidacy_end <= now() then
      raise exception 'اختر لإغلاق الباب المعاد فتحه موعدًا في المستقبل (المادة 23)';
    end if;
    if v_reason is null or char_length(v_reason) < 10 then
      raise exception 'اكتب سبب إعادة فتح الباب (10 أحرف على الأقلّ) (المادة 23)';
    end if;
    update elections
       set status = 'candidacy_open', candidacy_end = p_candidacy_end, stalled_at = null, stall_reason = null
     where id = p_election;
  elsif v_cur = 'candidacy_closed' and p_new_status = 'voting_open' then
    if p_voting_end is null or p_voting_end <= now() then
      raise exception 'اختر لإغلاق التصويت موعدًا في المستقبل (المادة 23)';
    end if;
    update elections set status = 'voting_open', voting_end = p_voting_end where id = p_election;
  elsif v_cur = 'voting_open' and p_new_status = 'voting_closed' then
    if v_reason is null or char_length(v_reason) < 10 then
      raise exception 'اكتب سبب إغلاق التصويت قبل موعده (10 أحرف على الأقلّ)، فيُبلَّغ به الناخبون (المادة 23)';
    end if;
    v_early := v_e.voting_end is not null and v_e.voting_end > now();
    update elections set status = 'voting_closed' where id = p_election;
  else
    raise exception 'انتقالٌ غير مسموح: % ← %', v_cur, p_new_status;
  end if;
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (p_election, v_uid, 'status_transition',
          jsonb_strip_nulls(jsonb_build_object(
            'new_status',    p_new_status,
            'voting_end',    case when p_new_status = 'voting_open' then p_voting_end end,
            'candidacy_end', case when p_new_status = 'candidacy_open' then p_candidacy_end end,
            'early',         case when v_early then true end,
            'reason',        v_reason)));
  if p_new_status = 'voting_closed' then
    perform public._after_voting_closed(p_election);
  end if;
end;
$$;

-- ── ١١. الكنّاس الدقيقيّ للمواعيد ──────────────────────────────────────────────────────────────
-- كما كان في إغلاق الباب بموعده وتعثّره، وفي إغلاق التصويت بموعده، ويزيد: الحسمَ بعد الإغلاق،
-- والتعادلَ الذي مضى أجله يفوز فيه الأسبق ترشّحًا، وإعادةَ ما لم يُحسم من مقاعد القسم.
create or replace function public.sweep_election_deadlines()
returns table(closed_candidacy integer, closed_voting integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_closed_c integer := 0;
  v_stalled  integer := 0;
  v_v        integer := 0;
  v_ties     integer := 0;
  r          record;
  v_count    integer;
  v_label    text;
begin
  for r in
    select id from elections
    where status = 'candidacy_open' and archived_at is null and stalled_at is null
      and candidacy_end is not null and candidacy_end < now()
  loop
    v_count := public._count_active_candidates(r.id);
    v_label := public._election_target_label(r.id);
    if v_count = 0 then
      perform public._stall_election(r.id, 'no_candidates', jsonb_build_object('active_count', 0));
      v_stalled := v_stalled + 1;
    else
      update elections set status = 'candidacy_closed' where id = r.id;
      insert into election_audit_log (election_id, actor_id, event_type, payload)
      values (r.id, null, 'status_transition',
              jsonb_build_object('new_status', 'candidacy_closed', 'auto', true, 'active_count', v_count));
      perform public._send_election_notification(
        r.id, 'election_participants', 'أُغلق باب الترشح تلقائياً',
        'انتهت فترة تقديم الترشيحات لـ ' || v_label || '. لن يُقبل مرشحون جدد.',
        'info', 'normal', null,
        jsonb_build_object('event', 'candidacy_auto_closed', 'active_count', v_count));
      v_closed_c := v_closed_c + 1;
    end if;
  end loop;

  for r in
    select id from elections
    where status = 'voting_open' and archived_at is null and voting_end is not null and voting_end < now()
  loop
    update elections set status = 'voting_closed' where id = r.id;
    insert into election_audit_log (election_id, actor_id, event_type, payload)
    values (r.id, null, 'status_transition', jsonb_build_object('new_status', 'voting_closed', 'auto', true));
    perform public._send_election_notification(
      r.id, 'election_participants', 'انتهى التصويت',
      'انتهى التصويت لـ ' || public._election_target_label(r.id) || '.',
      'info', 'normal', null, jsonb_build_object('event', 'voting_auto_closed'));
    perform public._after_voting_closed(r.id);
    v_v := v_v + 1;
  end loop;

  -- التعادل الذي مضى أجله: يفوز الأسبق ترشّحًا آليًّا (المادة 26).
  for r in select id from election_ties where status = 'open' and due_at <= now() loop
    begin
      perform public._settle_tie(r.id, public._tie_earliest(r.id), 'earliest');
      v_ties := v_ties + 1;
    exception when others then
      insert into election_audit_log (election_id, actor_id, event_type, payload)
      select election_id, null, 'resolve_failed', jsonb_build_object('tie_id', r.id, 'error', sqlerrm)
      from election_ties where id = r.id;
    end;
  end loop;

  -- ما بقي مغلقًا بلا إعلان: مقعدٌ كان ينتظر مقعدًا مرتبطًا فأُغلق أو تعثّر أو أُلغي، أو حسمٌ تعذّر.
  for r in
    select e.id from elections e
    where e.status = 'voting_closed' and e.archived_at is null and e.winner_candidate_id is null and e.stalled_at is null
      and not exists (select 1 from election_ties t where t.election_id = e.id and t.status = 'open')
  loop
    begin
      perform public._resolve_department(r.id);
    exception when others then null;
    end;
  end loop;

  if v_closed_c + v_stalled + v_v + v_ties > 0 then
    insert into election_audit_log (election_id, actor_id, event_type, payload)
    values (null, null, 'sweep_deadlines',
            jsonb_build_object('closed_candidacy', v_closed_c, 'stalled_candidacy', v_stalled,
                               'closed_voting', v_v, 'ties_settled', v_ties));
  end if;
  return query select v_closed_c, v_v;
end;
$$;

-- ── ١٢. الإلغاء (المادة 29) ───────────────────────────────────────────────────────────────────
-- بعد فتح التصويت لا يُلغى إلا لتعثّره، أو لخللٍ يمسّ صحّته يُسمّى في القرار. ويبقى أثر التعثّر
-- بعد الإلغاء، لأنّ للمديرين أن يعيّنوا على المقعد الذي أُلغي لتعثّره (المادة 25). وما فيه من تعادل
-- قائم يسقط.
drop function public.cancel_election(uuid, text);
create function public.cancel_election(p_election uuid, p_reason text default null, p_basis text default null)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e                    elections%rowtype;
  v_reason               text := nullif(btrim(coalesce(p_reason, '')), '');
  v_votes_preserved      int := 0;
  v_candidates_preserved int := 0;
  v_files_preserved      int := 0;
begin
  if not public._can_manage_election(auth.uid(), p_election) then
    raise exception 'غير مصرح بإلغاء الانتخاب' using errcode = '42501';
  end if;
  select * into v_e from elections where id = p_election for update;
  if not found then raise exception 'الانتخاب غير موجود'; end if;
  if v_e.status = 'completed' then raise exception 'لا يمكن إلغاء انتخاب مكتمل'; end if;
  if v_e.status = 'cancelled' then raise exception 'الانتخاب ملغًى من قبل'; end if;
  if v_reason is null or char_length(v_reason) < 10 then
    raise exception 'اكتب سبب الإلغاء (10 أحرف على الأقلّ) (المادة 29)';
  end if;
  if v_e.status in ('voting_open', 'voting_closed') then
    if coalesce(p_basis, '') not in ('stalled', 'defect') then
      raise exception 'بعد فتح التصويت لا يُلغى الانتخاب إلا لتعثّره، أو لخللٍ يمسّ صحّته يُسمّى في القرار (المادة 29)';
    end if;
    if p_basis = 'stalled' and v_e.stalled_at is null then
      raise exception 'هذا الانتخاب لم يتعثّر؛ سمِّ الخلل الذي يمسّ صحّته (المادة 29)';
    end if;
  elsif p_basis is not null and p_basis not in ('stalled', 'defect') then
    raise exception 'سببٌ غير معروف للإلغاء';
  end if;

  select count(*) into v_votes_preserved from election_votes where election_id = p_election;
  select count(*) into v_candidates_preserved from election_candidates where election_id = p_election;
  select count(*) into v_files_preserved
    from storage.objects
   where bucket_id = 'election-files' and name like '%/' || p_election::text || '/%';

  update elections
     set status              = 'cancelled',
         winner_candidate_id = null,
         winner_declared_at  = null,
         winner_declared_by  = null,
         archived_at         = coalesce(archived_at, now())
   where id = p_election;

  update election_ties set status = 'void', void_reason = 'election_cancelled', decided_at = now()
   where election_id = p_election and status = 'open';

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (p_election, auth.uid(), 'cancelled',
          jsonb_strip_nulls(jsonb_build_object(
            'reason',               v_reason,
            'basis',                p_basis,
            'was_stalled',          v_e.stalled_at is not null,
            'votes_preserved',      v_votes_preserved,
            'candidates_preserved', v_candidates_preserved,
            'files_preserved',      v_files_preserved)));

  -- مقعدٌ في القسم كان ينتظر هذا: يُعلن الآن وحده (المادة 27).
  perform public._after_voting_closed(p_election);
  return '{}'::text[];
end;
$$;
revoke execute on function public.cancel_election(uuid, text, text) from public, anon;
grant execute on function public.cancel_election(uuid, text, text) to authenticated;

-- ── ١٣. التعيين والتكليف على المقعد المتعثّر (المادة 25) ────────────────────────────────────────
-- من سقطت تزكيته في الانتخاب لا يُعيَّن عليه ولا يُكلَّف.
create or replace function public._failed_confidence_user(p_election uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from elections e
    join election_candidates ec on ec.election_id = e.id and ec.user_id = p_user
    where e.id = p_election and e.stall_reason = 'confidence_failed');
$$;
revoke execute on function public._failed_confidence_user(uuid, uuid) from public, anon, authenticated;

-- التعيين: يُسند المقعد دائمًا، ويكتمل به الانتخاب «بالتعيين». للمديرين الثلاثة وحدهم.
create or replace function public.appoint_seat_holder(p_election uuid, p_user uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_e      elections%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_res    jsonb;
  v_name   text;
begin
  if not public.has_election_admin_permission(v_uid) then
    raise exception 'التعيين على المقعد المتعثّر لمديري الانتخابات الثلاثة وحدهم (المادة 25)' using errcode = '42501';
  end if;
  if v_reason is null or char_length(v_reason) < 10 then
    raise exception 'اكتب سبب التعيين (10 أحرف على الأقلّ)';
  end if;
  select * into v_e from elections where id = p_election for update;
  if not found then raise exception 'الانتخاب غير موجود'; end if;
  if v_e.status = 'completed' then raise exception 'هذا الانتخاب مكتمل'; end if;
  if v_e.stalled_at is null then
    raise exception 'لا يُعيَّن إلا على مقعدٍ تعثّر انتخابه، أو أُلغي لتعثّره (المادة 25)';
  end if;
  if public._failed_confidence_user(p_election, p_user) then
    raise exception 'من سقطت تزكيته في هذا الانتخاب لا يُعيَّن عليه (المادة 25)';
  end if;
  select full_name into v_name from profiles where id = p_user;
  if v_name is null then raise exception 'العضو غير موجود'; end if;

  v_res := assign_position(
    p_actor      => v_uid,
    p_user       => p_user,
    p_role_name  => v_e.target_role_name,
    p_committee  => v_e.target_committee_id,
    p_department => v_e.target_department_id,
    p_replace    => true,
    p_notes      => 'تعيينٌ على مقعدٍ تعثّر انتخابه (' || p_election::text || '): ' || v_reason);
  if not coalesce((v_res->>'ok')::boolean, false) then
    raise exception 'تعذّر التعيين: %', coalesce(v_res->>'message', 'خطأ غير معروف');
  end if;

  update elections
     set status = 'completed', completed_by = 'appointment', appointed_user_id = p_user,
         archived_at = coalesce(archived_at, now())
   where id = p_election;
  update election_ties set status = 'void', void_reason = 'appointed', decided_at = now()
   where election_id = p_election and status = 'open';

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (p_election, v_uid, 'completed_by_appointment',
          jsonb_build_object('user_id', p_user, 'reason', v_reason, 'from_status', v_e.status, 'assignment', v_res));
  perform public._send_election_notification(
    p_election, 'election_voters', 'اكتمل الانتخاب بالتعيين',
    'عُيّن ' || v_name || ' على ' || public._election_target_label(p_election) || ' بعد تعثّر انتخابه.',
    'info', 'normal', null, jsonb_build_object('event', 'completed_by_appointment', 'user_id', p_user));

  perform public._after_voting_closed(p_election);
end;
$$;
grant execute on function public.appoint_seat_holder(uuid, uuid, text) to authenticated;

-- التكليف على المقعد المتعثّر: كما كان، إلا أنّه لم يعد يلغي الانتخاب (المادة 8)، ولا يُكلَّف به
-- من سقطت تزكيته فيه (المادة 25). ويمضي الانتخاب بإعادة فتحه أو إلغائه بقرارٍ مستقلّ.
create or replace function public.appoint_to_seat(p_election uuid, p_user uuid, p_reason text, p_until date, p_freeze boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e      elections%rowtype;
  v_res    jsonb;
  v_name   text;
  v_holder integer;
begin
  if not has_election_admin_permission(auth.uid()) then
    raise exception 'التكليف على المقعد المتعثّر لمديري الانتخابات الثلاثة وحدهم (المادة 25)' using errcode = '42501';
  end if;
  if p_reason is null or length(trim(p_reason)) < 10 then
    raise exception 'سببُ التكليف مطلوب (10 أحرف على الأقلّ)';
  end if;
  select * into v_e from elections where id = p_election for update;
  if not found then raise exception 'الانتخاب غير موجود'; end if;
  if v_e.status = 'completed' then raise exception 'هذا الانتخاب مكتمل'; end if;
  if v_e.status = 'voting_open' then raise exception 'لا تُكلِّف والتصويتُ جارٍ؛ أغلِق التصويت أوّلًا'; end if;
  if public._failed_confidence_user(p_election, p_user) then
    raise exception 'من سقطت تزكيته في هذا الانتخاب لا يُكلَّف عليه (المادة 25)';
  end if;
  select full_name into v_name from profiles where id = p_user;
  if v_name is null then raise exception 'العضو غير موجود'; end if;

  select ur.id into v_holder
  from user_roles ur join roles r on r.role_name = ur.role_name
  where ur.role_name = v_e.target_role_name and ur.is_active and ur.is_acting
    and (r.holder_uniqueness <> 'per_committee'  or ur.committee_id  is not distinct from v_e.target_committee_id)
    and (r.holder_uniqueness <> 'per_department' or ur.department_id is not distinct from v_e.target_department_id)
  limit 1;
  if v_holder is not null then
    perform public._end_acting(v_holder, auth.uid(), 'replaced', 'تكليف على مقعدٍ تعثّر انتخابُه (' || p_election::text || ')');
  end if;

  v_res := assign_acting(
    p_actor      => auth.uid(),
    p_user       => p_user,
    p_role_name  => v_e.target_role_name,
    p_committee  => v_e.target_committee_id,
    p_department => v_e.target_department_id,
    p_until      => p_until,
    p_freeze     => coalesce(p_freeze, false),
    p_reason     => 'تكليف على مقعدٍ تعثّر انتخابُه (' || p_election::text || '): ' || trim(p_reason));
  if not coalesce((v_res->>'ok')::boolean, false) then
    raise exception 'تعذّر التكليف: %', coalesce(v_res->>'message', 'خطأ غير معروف');
  end if;

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (p_election, auth.uid(), 'seat_appointed',
          jsonb_build_object('user_id', p_user, 'reason', trim(p_reason), 'until', p_until,
                             'freeze', coalesce(p_freeze, false), 'assignment', v_res));
  perform public._send_election_notification(
    p_election, 'election_voters', 'كُلّف شاغلٌ للمقعد',
    'كُلّف ' || v_name || ' بـ' || public._election_target_label(p_election)
      || ' حتّى ' || to_char(p_until, 'YYYY-MM-DD') || '.',
    'info', 'normal', null,
    jsonb_build_object('event', 'seat_appointed', 'user_id', p_user, 'until', p_until));
end;
$$;

-- ── ١٤. حال القسم كما تعرضه الشاشة ──────────────────────────────────────────────────────────────
-- كم مقعدًا في القسم يحجز هذا الانتخاب عن الإعلان، وكم ينتظر معه. والمجمَّد ترشّحٌ قائم.
create or replace function public.department_resolution_state(p_election uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dept     integer := election_department(p_election);
  v_blocking integer;
  v_pending  integer;
begin
  select count(*) filter (where e.status in ('candidacy_open', 'candidacy_closed', 'voting_open') and e.stalled_at is null),
         count(*) filter (where e.status = 'voting_closed' and e.winner_candidate_id is null and e.stalled_at is null)
    into v_blocking, v_pending
  from elections e
  where e.id <> p_election and e.archived_at is null and election_department(e.id) = v_dept
    and exists (
      select 1 from election_candidates a
      join election_candidates b on b.user_id = a.user_id and b.election_id = e.id
      where a.election_id = p_election and a.status in ('approved', 'frozen') and public._is_live_candidacy(b.status));
  return jsonb_build_object('department', v_dept,
                            'blocking', coalesce(v_blocking, 0),
                            'pending',  coalesce(v_pending, 0),
                            'tie_open', exists (select 1 from election_ties t where t.election_id = p_election and t.status = 'open'));
end;
$$;

-- ── ١٥. لا إعلان باليد (المادة 28) ──────────────────────────────────────────────────────────────
drop function public.declare_winner(uuid, uuid);
drop function public.resolve_department_election_winners(integer);
drop function public.declare_winner_apply(uuid, uuid);
drop function public._finalize_confidence(uuid);
