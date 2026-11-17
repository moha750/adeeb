-- ═══════════════════════════════════════════════════════════════════════════
-- الانتخابات على الإصدار الثاني من نظامها، الدفعة الثانية: الترشّح (2026-11-16)
--
-- تُبنى على الدفعة الأولى (20261116130000) وتُطبَّق بعدها، ولا تُطبَّق ولا تُرفع إلا بإذن
-- محمد، ومع نقل الشاشات (الخطوة ٥).
--
-- ما فيها:
--   (١) حالتان جديدتان للترشّح: «مجمَّد» (قائمٌ محجوب)، و«منتهٍ» بسببٍ من قائمة (نهائيّة).
--   (٢) يرى ناخبو المقعد المرشّحَ المعتمَد فور اعتماده ولو كان الباب مفتوحًا، ويرى حسابُ النادي
--       ما يراه الناخب. والترتيب بوقت التقدّم لا بالرقم (المواد ٥ و١٣).
--   (٣) طلب التعديل بمهلةٍ يحدّدها المراجع، ويُعدَّل فيها ولو أُغلق الباب، فإن مضت انتهى الترشّح
--       آليًّا. والاعتذار بسببٍ من الثلاثة (المادة ١٤).
--   (٤) الإرجاع بسببٍ مكتوب: المنسحبُ بطلبه أو لخطأ، والمعتذَرُ عنه لخطأ (المادة ١٥).
--   (٥) التجميد والاستبعاد (المادة ١٦): يطلبه عضو الموارد ويوافق قائدها، أو يصدره القائد، فيسري
--       فورًا. ومهلتان في القرار: للإجابة، ثمّ لقرار الإدارة. وكنّاسةٌ تستبعد من لم يُجب وترفع
--       التجميد إن لم تقرّر الإدارة. والتجميد في هذه الدفعة قبل فتح التصويت وحده.
--   (٦) فقد الأهليّة قبل التصويت (المادة ١٧): انتهاء العضويّة، ودخول إحدى الإدارات، والخروج من
--       نطاق المقعد، كلّها تُنهي الترشّح بسببها وتُقيَّد في السجلّ.
--
-- قراءةٌ مني في (٥): قرار الإدارة بعد الإجابة (رفع التجميد أو الاستبعاد) يصدره قائدها.
-- ولا يُطلب تجميدٌ قبل أن تُبنى إشعاراته وشاشة إجابته (الخطوتان ٤ و٥)، فيُرفع معهما.
-- وحساب القسم (مقعدان مرتبطان) يعدّ المجمَّد قائمًا حين تُعاد كتابة دوالّ الإعلان في الدفعة الثالثة.
-- وما ليس فيها: التفريق بين النقل بطلب صاحبه وبغير طلبه، فيأتي مع نافذة النقل في الدفعة الرابعة،
-- وإلى ذلك يُنهي الخروجُ من النطاق الترشّحَ كما يفعل اليوم. وما بعد فتح التصويت (بطلان الأصوات).
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── (١) الحالات والأعمدة ───────────────────────────────────────────────────

alter table public.election_candidates
  add column edit_due_at  timestamptz,
  add column end_reason   text,
  add column ended_at     timestamptz,
  add column reject_reason text;

alter table public.election_candidates drop constraint election_candidates_status_check;
alter table public.election_candidates add constraint election_candidates_status_check
  check (status in ('pending', 'approved', 'rejected', 'needs_edit', 'withdrawn', 'frozen', 'ended'));

-- أسباب انتهاء الترشّح. ومنها ما تأتي به الدفعات التالية (الاحتفاظ بمقعدٍ آخر، والحرمان).
alter table public.election_candidates add constraint election_candidates_end_reason_check
  check (end_reason is null or end_reason in
         ('edit_expired', 'excluded', 'membership_ended', 'joined_admin', 'left_scope', 'frozen_by_acting',
          'kept_other_seat', 'debarred'));
alter table public.election_candidates add constraint election_candidates_ended_has_reason
  check (status <> 'ended' or end_reason is not null);

-- أسباب الاعتذار الثلاثة (المادة ١٤). والقديم بلا سبب يبقى كما كان.
alter table public.election_candidates add constraint election_candidates_reject_reason_check
  check (reject_reason is null or reject_reason in ('ineligible', 'statement_violation', 'unrelated'));

-- الترشّح القائم (المادة ٢): قيد المراجعة، أو مطلوبٌ تعديله، أو معتمَد، أو مجمَّد.
create or replace function public._is_live_candidacy(p_status text)
returns boolean
language sql
immutable
as $$
  select p_status in ('pending', 'approved', 'needs_edit', 'frozen');
$$;

create or replace function public._count_active_candidates(p_election uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from election_candidates
  where election_id = p_election and public._is_live_candidacy(status);
$$;


-- ─── سجلّ التجميد ──────────────────────────────────────────────────────────

create table public.election_freezes (
  id              bigserial primary key,
  candidate_id    uuid not null references public.election_candidates(id) on delete restrict,
  election_id     uuid not null references public.elections(id) on delete restrict,
  reason          text not null check (char_length(btrim(reason)) >= 10),
  answer_window   interval not null check (answer_window > interval '0'),
  decide_window   interval not null check (decide_window > interval '0'),
  requested_by    uuid not null,
  requested_at    timestamptz not null default now(),
  approved_by     uuid,
  approved_at     timestamptz,
  prior_status    text,
  edit_remaining  interval,
  answer_due      timestamptz,
  answer_text     text,
  answered_at     timestamptz,
  decide_due      timestamptz,
  status          text not null default 'requested'
                  check (status in ('requested', 'active', 'answered', 'closed')),
  outcome         text check (outcome in ('lifted', 'excluded', 'auto_excluded', 'auto_lifted',
                                          'withdrawn', 'ended', 'declined', 'stale', 'election_cancelled')),
  decided_by      uuid,
  decided_at      timestamptz,
  decision_reason text
);
create unique index election_freezes_one_open
  on public.election_freezes (candidate_id) where status <> 'closed';

-- القراءة لمن يطّلع على الانتخاب. وصاحب الترشّح يرى تجميده من `get_user_candidacies` وحدها، فلا
-- يرى من طلبه من أعضاء الموارد، ولا الطلبات التي رُدّت (المادة ٥). ولا كتابة مباشرة: الامتيازات
-- الافتراضيّة للجداول الجديدة تعطي العميل كلّ شيء، فتُسحب صراحةً.
alter table public.election_freezes enable row level security;
revoke all on public.election_freezes from anon, authenticated;
revoke all on sequence public.election_freezes_id_seq from anon, authenticated;
grant select on public.election_freezes to authenticated;
create policy election_freezes_select on public.election_freezes for select to authenticated
  using (public.has_election_view_permission((select auth.uid()), election_id)
         or public.has_election_admin_permission((select auth.uid())));
create trigger election_freezes_no_delete before delete on public.election_freezes
  for each row execute function public.forbid_election_delete();
create trigger election_freezes_no_truncate before truncate on public.election_freezes
  for each statement execute function public.forbid_election_delete();


-- ─── حارس الانتقال بين حالات الترشّح ──────────────────────────────────────
-- الانتقالات الجديدة لا تمرّ إلا من دوالّها: كلٌّ منها يضع `adeeb.candidacy_op` للمعاملة
-- (التجميد، ورفعه، والإنهاء، والإرجاع)، فلا تُكتب حالةٌ منها بنداءٍ مباشر.
create or replace function public.enforce_candidate_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election_status text;
  v_ok              boolean := false;
  v_manager         boolean;
  v_op              text := coalesce(current_setting('adeeb.candidacy_op', true), '');
  v_stage           boolean;
begin
  if old.status = new.status then return new; end if;

  select status into v_election_status from elections where id = new.election_id;
  v_stage   := v_election_status in ('candidacy_open', 'candidacy_closed');
  v_manager := public._can_manage_election(auth.uid(), new.election_id)
            or coalesce(auth.role(), '') = 'service_role';

  if old.status = 'ended' or (old.status = 'rejected' and v_op <> 'restore') then
    raise exception 'هذه الحالة نهائية: %', old.status;
  end if;

  if new.status = 'withdrawn' and old.status in ('pending', 'approved', 'needs_edit', 'frozen') then
    if auth.uid() is distinct from new.user_id then
      raise exception 'الانسحاب بيد المرشّح وحده (المادة 15)' using errcode = '42501';
    end if;
    if not v_stage then raise exception 'لا يمكن الانسحاب بعد فتح التصويت'; end if;
    v_ok := true;

  elsif new.status = 'pending' and old.status in ('withdrawn', 'rejected') then
    if v_op <> 'restore' or not public._can_manage_election(auth.uid(), new.election_id) then
      raise exception 'الإرجاع بيد من يدير الانتخاب، بسببٍ مكتوب (المادة 15)' using errcode = '42501';
    end if;
    if not v_stage then raise exception 'لا يُرجع مرشح بعد فتح التصويت'; end if;
    v_ok := true;
    new.withdrawn_at := null;

  elsif old.status = 'pending' and new.status in ('approved', 'rejected', 'needs_edit') then
    -- المراجعة بيد من يدير الانتخاب (المادة ١٤)، تُفرض هنا لا في الباب وحده.
    if not v_manager then
      raise exception 'مراجعة الترشّح بيد من يدير الانتخاب وحده' using errcode = '42501';
    end if;
    if new.status = 'needs_edit' and (new.edit_due_at is null or new.edit_due_at <= now()) then
      raise exception 'طلب التعديل يلزمه مهلةٌ في المستقبل (المادة 14)';
    end if;
    if new.status = 'rejected' and new.reject_reason is null then
      raise exception 'الاعتذار يلزمه سببٌ من الثلاثة (المادة 14)';
    end if;
    v_ok := true;

  elsif old.status = 'needs_edit' and new.status = 'pending' then
    v_ok := true;

  elsif new.status = 'frozen' and old.status in ('pending', 'approved', 'needs_edit') then
    if v_op <> 'freeze' then raise exception 'التجميد بقرار إدارة الموارد البشرية (المادة 16)' using errcode = '42501'; end if;
    v_ok := true;

  elsif old.status = 'frozen' and new.status in ('pending', 'approved', 'needs_edit') then
    if v_op <> 'lift' then raise exception 'رفع التجميد بقرار إدارة الموارد البشرية (المادة 16)' using errcode = '42501'; end if;
    v_ok := true;

  elsif new.status = 'ended' and public._is_live_candidacy(old.status) then
    if v_op <> 'end' then raise exception 'ينتهي الترشّح بسببه من بابه' using errcode = '42501'; end if;
    v_ok := true;
  end if;

  if not v_ok then
    raise exception 'انتقال مرشح غير مسموح: % ← %', old.status, new.status;
  end if;

  if new.status in ('rejected', 'needs_edit') then
    if new.review_note_ar is null or btrim(new.review_note_ar) = '' then
      raise exception 'يجب كتابة سبب الاعتذار أو التعديل';
    end if;
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  if new.status = 'approved' and old.status = 'pending' then
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  if new.status = 'withdrawn' then new.withdrawn_at := coalesce(new.withdrawn_at, now()); end if;
  if new.status = 'ended' then new.ended_at := coalesce(new.ended_at, now()); end if;
  -- المهلة لمطلوب التعديل وحده، وتسقط بخروجه منه.
  if new.status <> 'needs_edit' then new.edit_due_at := null; end if;

  return new;
end;
$$;

-- إنهاء الترشّح بسببه، بيد القاعدة لا بنداءٍ مباشر. الفاعل NULL حين يقع آليًّا.
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
    -- ومعه تجميده إن كان: يُغلق بأنّ الترشّح انتهى، لا بأنّ صاحبه انسحب.
    update election_freezes set status = 'closed', outcome = coalesce(nullif(p_payload->>'freeze_outcome', ''), 'ended'),
           decided_by = coalesce(decided_by, p_actor), decided_at = coalesce(decided_at, now())
     where candidate_id = p_candidate and status <> 'closed';
    insert into election_audit_log (election_id, actor_id, event_type, payload)
    values (v_election, p_actor, 'candidacy_ended',
            jsonb_build_object('candidate_id', p_candidate, 'reason', p_reason) || coalesce(p_payload, '{}'::jsonb));
  end if;
end;
$$;
revoke execute on function public._end_candidacy(uuid, text, uuid, jsonb) from public, anon, authenticated;


-- ─── (٢) ما يراه الناخب ───────────────────────────────────────────────────
-- يرى ناخبو المقعد المرشّحَ المعتمَد فور اعتماده، ولو كان الباب مفتوحًا، ولا يرون المجمَّد.
-- ويرى حسابُ النادي ما يراه الناخب. ولا رقم يُرتَّب به: الأسبقيّة بوقت التقدّم (المادتان ٥ و١٣).
-- ويبقى عمود الرقم في الإرجاع للتطبيق القائم حتى تُنقل شاشاته.
create or replace function public._is_club_account(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active and ur.role_name = 'adeeb_admin');
$$;
revoke execute on function public._is_club_account(uuid) from public, anon, authenticated;

create or replace function public.get_ballot_candidates(p_election uuid)
returns table(candidate_id uuid, candidate_number integer, full_name text, gender text, avatar_url text,
              statement_ar text, file_url text, file_name text, file_size_bytes integer, file_mime text, is_self boolean)
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

  if not (public._can_manage_election(auth.uid(), p_election)
          or has_election_view_permission(auth.uid(), p_election)
          or public._is_club_account(auth.uid())
          or is_user_eligible_to_vote(auth.uid(), p_election)) then
    raise exception 'غير مؤهل لعرض مرشحي هذا الانتخاب';
  end if;

  return query
  select ec.id, ec.candidate_number, p.full_name, p.gender, p.avatar_url,
         ec.statement_ar, ec.file_url, ec.file_name, ec.file_size_bytes, ec.file_mime,
         (ec.user_id = auth.uid()) as is_self
  from election_candidates ec
  left join profiles p on p.id = ec.user_id
  where ec.election_id = p_election and ec.status = 'approved'
  order by ec.submitted_at, ec.id;
end;
$$;

-- وملفّ البيان يقرؤه من يرى المرشّح من اعتماده، ومن يدير الانتخاب في كلّ حال (ليراجعه).
-- والهويّة من الجلسة لا من الوسيط، فلا يُسأل بها عن غيرك؛ ويبقى الوسيط لأنّ سياسة التخزين تمرّره.
create or replace function public.can_voter_read_election_file(p_user uuid, p_obj_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from election_candidates ec
    join elections e on e.id = ec.election_id
    where ec.file_url is not null
      and position(p_obj_name in ec.file_url) > 0
      and (public._can_manage_election(auth.uid(), e.id)
           or (ec.status = 'approved'
               and (is_user_eligible_to_vote(auth.uid(), e.id) or public._is_club_account(auth.uid()))))
  );
$$;


-- ─── (٣) المراجعة بمهلةٍ وسبب ─────────────────────────────────────────────
-- طلب التعديل يلزمه موعدٌ يحدّده المراجع بلا حدٍّ أدنى، والاعتذار سببٌ من الثلاثة.
drop function public.review_candidate(uuid, text, text);

create function public.review_candidate(
  p_candidate uuid,
  p_new_status text,
  p_note_ar text default null,
  p_edit_due timestamptz default null,
  p_reject_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election uuid;
  v_status   text;
begin
  select election_id, status into v_election, v_status from election_candidates where id = p_candidate for update;
  if v_election is null then raise exception 'المرشح غير موجود'; end if;

  if not public._can_manage_election(auth.uid(), v_election) then
    raise exception 'غير مصرح بمراجعة المرشحين' using errcode = '42501';
  end if;
  -- لا يُبتّ إلا فيما كان قيد المراجعة، ولا يُعاد النظر في قرارٍ بالمراجعة (المادة ١٤).
  if v_status <> 'pending' then
    raise exception 'لا يُبتّ إلا في ترشّحٍ قيد المراجعة';
  end if;
  if p_new_status not in ('approved', 'rejected', 'needs_edit') then
    raise exception 'قيمة حالة المرشح غير مدعومة في المراجعة';
  end if;
  if p_new_status = 'needs_edit' and (p_edit_due is null or p_edit_due <= now()) then
    raise exception 'حدّد مهلة التعديل موعدًا في المستقبل (المادة 14)';
  end if;
  if p_new_status = 'rejected' and coalesce(p_reject_reason, '') not in ('ineligible', 'statement_violation', 'unrelated') then
    raise exception 'اختر سبب الاعتذار: لا يجوز له، أو بيانٌ يخالف الضوابط، أو لا يتّصل بالمقعد (المادة 14)';
  end if;

  update election_candidates
     set status        = p_new_status,
         review_note_ar = p_note_ar,
         reviewed_by   = auth.uid(),
         reviewed_at   = now(),
         edit_due_at   = case when p_new_status = 'needs_edit' then p_edit_due end,
         reject_reason = case when p_new_status = 'rejected' then p_reject_reason end
   where id = p_candidate;

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_election, auth.uid(), 'candidate_reviewed',
          jsonb_strip_nulls(jsonb_build_object(
            'candidate_id', p_candidate, 'new_status', p_new_status, 'note', p_note_ar,
            'edit_due', case when p_new_status = 'needs_edit' then p_edit_due end,
            'reject_reason', case when p_new_status = 'rejected' then p_reject_reason end)));
end;
$$;
grant execute on function public.review_candidate(uuid, text, text, timestamptz, text) to authenticated;

-- التعديل: قيد المراجعة والباب مفتوح، أو مطلوبٌ تعديله في مهلته ولو أُغلق الباب (المادة ١٥).
create or replace function public.resubmit_candidacy(
  p_candidate uuid, p_statement_ar text, p_file_url text default null, p_file_name text default null,
  p_file_size_bytes integer default null, p_file_mime text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c           election_candidates%rowtype;
  v_elec_status text;
  v_event       text;
  v_file_change text;
begin
  select ec.* into v_c from election_candidates ec where ec.id = p_candidate;
  if not found then raise exception 'الترشح غير موجود'; end if;
  select status into v_elec_status from elections where id = v_c.election_id;

  if v_c.user_id <> auth.uid() then raise exception 'لا يمكن تعديل ترشح مستخدم آخر'; end if;

  if v_c.status = 'pending' then
    if v_elec_status <> 'candidacy_open' then
      raise exception 'لا يُعدَّل ما كان قيد المراجعة بعد إغلاق باب الترشّح';
    end if;
  elsif v_c.status = 'needs_edit' then
    if v_elec_status not in ('candidacy_open', 'candidacy_closed') then
      raise exception 'لا يُعدَّل الترشّح بعد فتح التصويت';
    end if;
    if v_c.edit_due_at is null or v_c.edit_due_at <= now() then
      raise exception 'مضت مهلة التعديل';
    end if;
  else
    raise exception 'لا يمكن تعديل الترشح في حالته الحالية';
  end if;

  v_file_change := case
    when v_c.file_url is null and p_file_url is not null then 'added'
    when v_c.file_url is not null and p_file_url is null then 'removed'
    when v_c.file_url is distinct from p_file_url then 'replaced'
    else 'none' end;

  update election_candidates
     set statement_ar = p_statement_ar, file_url = p_file_url, file_name = p_file_name,
         file_size_bytes = p_file_size_bytes, file_mime = p_file_mime,
         status = 'pending', review_note_ar = null, reviewed_at = null, reviewed_by = null
   where id = p_candidate;

  v_event := case when v_c.status = 'needs_edit' then 'candidate_resubmitted' else 'candidate_updated' end;
  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_c.election_id, auth.uid(), v_event,
          jsonb_build_object('candidate_id', p_candidate,
                             'statement_changed', (v_c.statement_ar is distinct from p_statement_ar),
                             'file_change', v_file_change));
end;
$$;

-- لا يُفتح التصويت وفيه ترشّحٌ قيد المراجعة أو مطلوبٌ تعديله أو مجمَّد (المادة ٢٤).
create or replace function public.promote_to_voting_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unreviewed int;
  v_frozen     int;
  v_approved   int;
begin
  if new.status <> 'voting_open' or old.status = new.status then return new; end if;

  select count(*) filter (where status in ('pending', 'needs_edit')),
         count(*) filter (where status = 'frozen'),
         count(*) filter (where status = 'approved')
    into v_unreviewed, v_frozen, v_approved
    from election_candidates where election_id = new.id;

  if v_unreviewed > 0 then
    raise exception 'لا يمكن فتح التصويت: ترشّحاتٌ لم تُحسم بعد (قيد المراجعة أو مطلوبٌ تعديلها): %', v_unreviewed;
  end if;
  if v_frozen > 0 then
    raise exception 'لا يمكن فتح التصويت: ترشّحاتٌ مجمَّدة تنتظر قرار إدارة الموارد البشرية: %', v_frozen;
  end if;
  if v_approved < 1 then
    raise exception 'لا يمكن فتح التصويت: لا مرشّح معتمَد';
  end if;
  return new;
end;
$$;


-- ─── (٤) الإرجاع بسببٍ مكتوب ─────────────────────────────────────────────
-- المنسحبُ بطلبه أو لخطأ في انسحابه، والمعتذَرُ عنه لخطأ في الاعتذار، قبل فتح التصويت،
-- فيعود قيد المراجعة (المادة ١٥).
drop function public.restore_candidacy(uuid);

create function public.restore_candidacy(p_candidate uuid, p_basis text default null, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election uuid;
  v_status   text;
  v_note     text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select election_id, status into v_election, v_status from election_candidates where id = p_candidate;
  if v_election is null then raise exception 'الترشح غير موجود'; end if;

  if not public._can_manage_election(auth.uid(), v_election) then
    raise exception 'غير مصرح بإرجاع المرشحين' using errcode = '42501';
  end if;
  if v_status = 'withdrawn' then
    if coalesce(p_basis, '') not in ('candidate_request', 'withdrawal_error') then
      raise exception 'اختر سبب إرجاع المنسحب: بطلبه، أو لخطأ في انسحابه (المادة 15)';
    end if;
  elsif v_status = 'rejected' then
    if coalesce(p_basis, '') <> 'review_error' then
      raise exception 'لا يُرجع المعتذَر عنه إلا لخطأ في الاعتذار (المادة 15)';
    end if;
  else
    raise exception 'لا يُرجع إلا منسحبٌ أو معتذَرٌ عنه';
  end if;
  if v_note is null or char_length(v_note) < 10 then
    raise exception 'اكتب سبب الإرجاع (10 أحرف على الأقلّ)';
  end if;
  -- من انسحب وهو مجمَّد لا يُرجَع: الإرجاع لا يُسقط تجميدًا (المادة ١٦).
  if exists (select 1 from election_freezes where candidate_id = p_candidate and outcome = 'withdrawn') then
    raise exception 'انسحب وترشّحه مجمَّد، فلا يُرجَع';
  end if;
  -- وما زال يجوز له الترشّح يوم الإرجاع (المواد ٩ و١٠ و١٧).
  if not public._run_eligibility((select user_id from election_candidates where id = p_candidate), v_election, true) then
    raise exception 'لم يعد يجوز له الترشّح لهذا المقعد';
  end if;

  perform set_config('adeeb.candidacy_op', 'restore', true);
  update election_candidates
     set status = 'pending', review_note_ar = null, reviewed_at = null, reviewed_by = null, reject_reason = null
   where id = p_candidate;
  perform set_config('adeeb.candidacy_op', '', true);

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_election, auth.uid(), 'candidate_restored',
          jsonb_build_object('candidate_id', p_candidate, 'from', v_status, 'basis', p_basis, 'reason', v_note));
end;
$$;
grant execute on function public.restore_candidacy(uuid, text, text) to authenticated;


-- ─── (٥) التجميد والاستبعاد ───────────────────────────────────────────────

create or replace function public._is_hr_leader(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active and ur.role_name = 'hr_committee_leader');
$$;
revoke execute on function public._is_hr_leader(uuid) from public, anon, authenticated;

create or replace function public._is_hr_member(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                 and ur.role_name in ('hr_admin_member', 'hr_committee_leader'));
$$;
revoke execute on function public._is_hr_member(uuid) from public, anon, authenticated;

-- يسري التجميد: يُحجب المرشّح، وتقف مهلة التعديل، وتبدأ مهلة الإجابة.
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

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_f.election_id, p_approver, 'candidate_frozen',
          jsonb_build_object('candidate_id', v_c.id, 'freeze_id', p_freeze, 'reason', v_f.reason,
                             'requested_by', v_f.requested_by, 'answer_due', now() + v_f.answer_window));
end;
$$;
revoke execute on function public._apply_freeze(bigint, uuid) from public, anon, authenticated;

-- يُرفع التجميد: يعود الترشّح إلى حاله، وتُستأنف مهلة التعديل بما بقي منها.
create or replace function public._lift_freeze(p_freeze bigint, p_actor uuid, p_outcome text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_f election_freezes%rowtype;
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
end;
$$;
revoke execute on function public._lift_freeze(bigint, uuid, text, text) from public, anon, authenticated;

create or replace function public._exclude_frozen(p_freeze bigint, p_actor uuid, p_outcome text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_f election_freezes%rowtype;
begin
  select * into v_f from election_freezes where id = p_freeze for update;
  -- قد يكون أُغلق بينما انتظرنا القفل (قرارٌ وكنّاسة في اللحظة نفسها): لا يُغلق مرّتين.
  if v_f.status not in ('active', 'answered') then return; end if;
  update election_freezes set decision_reason = p_reason where id = p_freeze;
  perform public._end_candidacy(v_f.candidate_id, 'excluded', p_actor,
                                jsonb_build_object('freeze_id', p_freeze, 'freeze_outcome', p_outcome, 'note', p_reason));
end;
$$;
revoke execute on function public._exclude_frozen(bigint, uuid, text, text) from public, anon, authenticated;

-- طلب التجميد: من عضو الموارد ينتظر موافقة قائدها، ومن القائد يسري فورًا (المادة ١٦).
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
  v_status text;
  v_id     bigint;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public._is_hr_member(v_uid) then
    raise exception 'التجميد لإدارة الموارد البشرية (المادة 16)' using errcode = '42501';
  end if;
  select * into v_c from election_candidates where id = p_candidate for update;
  if not found then raise exception 'الترشح غير موجود'; end if;
  select status into v_status from elections where id = v_c.election_id;

  if v_c.status not in ('pending', 'approved', 'needs_edit') then
    raise exception 'لا يُجمَّد إلا ترشّحٌ قائم';
  end if;
  if v_status not in ('candidacy_open', 'candidacy_closed') then
    raise exception 'التجميد بعد فتح التصويت لم يُبنَ بعد';
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
       or not exists (select 1 from elections where id = v_f.election_id and status in ('candidacy_open', 'candidacy_closed')) then
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

-- إجابة المرشّح في مهلته، فيبدأ أجل قرار الإدارة.
create or replace function public.answer_candidacy_freeze(p_freeze bigint, p_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_f    election_freezes%rowtype;
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
begin
  select * into v_f from election_freezes where id = p_freeze for update;
  if not found then raise exception 'التجميد غير موجود'; end if;
  if not exists (select 1 from election_candidates where id = v_f.candidate_id and user_id = auth.uid()) then
    raise exception 'الإجابة لصاحب الترشّح وحده' using errcode = '42501';
  end if;
  if v_f.status <> 'active' then raise exception 'لا تجميد ينتظر إجابتك'; end if;
  if v_f.answer_due <= now() then raise exception 'مضت مهلة الإجابة'; end if;
  if v_text is null or char_length(v_text) < 10 then raise exception 'اكتب إجابتك (10 أحرف على الأقلّ)'; end if;

  update election_freezes
     set status = 'answered', answer_text = v_text, answered_at = now(), decide_due = now() + v_f.decide_window
   where id = p_freeze;

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_f.election_id, auth.uid(), 'freeze_answered',
          jsonb_build_object('candidate_id', v_f.candidate_id, 'freeze_id', p_freeze, 'decide_due', now() + v_f.decide_window));
end;
$$;
grant execute on function public.answer_candidacy_freeze(bigint, text) to authenticated;

-- قرار الإدارة: رفع التجميد في أيّ وقت، والاستبعاد بعد إجابة المرشّح. وما مضت مهلة إجابته
-- تستبعده الكنّاسة آليًّا.
create or replace function public.decide_candidacy_freeze(p_freeze bigint, p_outcome text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_f      election_freezes%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public._is_hr_leader(v_uid) then
    raise exception 'قرار التجميد لقائد إدارة الموارد البشرية' using errcode = '42501';
  end if;
  select * into v_f from election_freezes where id = p_freeze for update;
  if not found or v_f.status not in ('active', 'answered') then raise exception 'لا تجميد قائم هنا'; end if;
  if v_reason is null or char_length(v_reason) < 10 then raise exception 'اكتب سبب القرار (10 أحرف على الأقلّ)'; end if;
  if v_f.status = 'answered' and v_f.decide_due <= now() then
    raise exception 'مضى أجل القرار، فيُرفع التجميد آليًّا (المادة 16)';
  end if;

  if p_outcome = 'lift' then
    perform public._lift_freeze(p_freeze, v_uid, 'lifted', v_reason);
  elsif p_outcome = 'exclude' then
    if v_f.status <> 'answered' then
      raise exception 'لا يُستبعد قبل أن يُجيب أو تمضي مهلة إجابته (المادة 16)';
    end if;
    perform public._exclude_frozen(p_freeze, v_uid, 'excluded', v_reason);
  else
    raise exception 'القرار رفعُ التجميد أو الاستبعاد';
  end if;
end;
$$;
grant execute on function public.decide_candidacy_freeze(bigint, text, text) to authenticated;

-- الانسحاب بيد المرشّح وحده، ومنه المجمَّد، فيُغلق تجميده.
create or replace function public.withdraw_candidacy(p_candidate uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid;
  v_election uuid;
begin
  select user_id, election_id into v_user, v_election from election_candidates where id = p_candidate;
  if v_user is null then raise exception 'الترشح غير موجود'; end if;
  if v_user is distinct from auth.uid() then
    raise exception 'الانسحاب بيد المرشّح وحده (المادة 15)' using errcode = '42501';
  end if;

  update election_candidates set status = 'withdrawn', withdrawn_at = now() where id = p_candidate;
  update election_freezes
     set status = 'closed', outcome = 'withdrawn', decided_at = now()
   where candidate_id = p_candidate and status <> 'closed';

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_election, auth.uid(), 'candidate_withdrawn', jsonb_build_object('candidate_id', p_candidate));
end;
$$;

-- الكنّاسة: مهلة التعديل، ومهلة الإجابة، وأجل القرار. كلّ دقيقة.
create or replace function public.sweep_candidacy_deadlines()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r   record;
  v_n integer := 0;
begin
  -- مطلوبٌ تعديله مضت مهلته: ينتهي ترشّحه (المادة ١٤).
  for r in
    select ec.id from election_candidates ec join elections e on e.id = ec.election_id
    where ec.status = 'needs_edit' and ec.edit_due_at is not null and ec.edit_due_at <= now()
      and e.status in ('candidacy_open', 'candidacy_closed')
  loop
    perform public._end_candidacy(r.id, 'edit_expired', null);
    v_n := v_n + 1;
  end loop;

  -- طلب تجميدٍ لم يُوافَق عليه وقد خرج الانتخاب من الترشّح أو انتهى الترشّح: يسقط.
  update election_freezes f set status = 'closed', outcome = 'stale', decided_at = now()
   from elections e, election_candidates ec
   where e.id = f.election_id and ec.id = f.candidate_id and f.status = 'requested'
     and (e.status not in ('candidacy_open', 'candidacy_closed') or ec.status not in ('pending', 'approved', 'needs_edit'));

  -- تجميدٌ في انتخابٍ أُلغي أو اكتمل: يُغلق بلا أثر.
  update election_freezes f set status = 'closed', outcome = 'election_cancelled', decided_at = now()
   from elections e
   where e.id = f.election_id and f.status <> 'closed' and e.status in ('cancelled', 'completed');

  -- مجمَّدٌ لم يُجب في مهلته: يُستبعد آليًّا (المادة ١٦).
  for r in select id from election_freezes where status = 'active' and answer_due <= now() loop
    perform public._exclude_frozen(r.id, null, 'auto_excluded', 'مضت مهلة الإجابة ولم يُجب');
    v_n := v_n + 1;
  end loop;

  -- أجاب ولم تقرّر الإدارة في أجلها: يُرفع التجميد آليًّا (المادة ١٦).
  for r in select id from election_freezes where status = 'answered' and decide_due <= now() loop
    perform public._lift_freeze(r.id, null, 'auto_lifted', 'مضى أجل القرار ولم تقرّر الإدارة');
    v_n := v_n + 1;
  end loop;

  -- بابٌ أُغلق ثمّ لم يبقَ فيه ترشّحٌ قائم: تعثّر (المادة ٢٥). ويُعاد فتحه بموعدٍ وسبب أو يُلغى.
  for r in
    select e.id from elections e
    where e.status = 'candidacy_closed' and e.archived_at is null and e.stalled_at is null
      and public._count_active_candidates(e.id) = 0
  loop
    update elections set stalled_at = now() where id = r.id;
    insert into election_audit_log (election_id, actor_id, event_type, payload)
    values (r.id, null, 'candidacy_stalled', jsonb_build_object('active_count', 0, 'after_close', true));
    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

select cron.schedule('elections-sweep-candidacies', '* * * * *', 'select public.sweep_candidacy_deadlines();');


-- ─── (٦) فقد الأهليّة قبل التصويت ─────────────────────────────────────────
-- الخروج من نطاق المقعد ينهي الترشّح بسببه: انتهاء العضويّة، أو الخروج من الوحدة. كان يُسجَّل
-- «انسحابًا» بلا قيدٍ في السجلّ، والانسحاب فعل المرشّح وحده.
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
  -- جُمّد أصيله بتكليف: ينتهي ترشّحه في غير مقعد تكليفه (المادة ١٧).
  if new.frozen_by is not null and old.frozen_by is null then
    select * into v_act from user_roles where id = new.frozen_by;
    for r in
      select ec.id from election_candidates ec join elections e on e.id = ec.election_id
      where ec.user_id = new.user_id and public._is_live_candidacy(ec.status)
        and e.archived_at is null and e.status in ('candidacy_open', 'candidacy_closed')
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
        and e.archived_at is null and e.status in ('candidacy_open', 'candidacy_closed')
        and ((old.committee_id is not null and e.target_committee_id = old.committee_id)
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

-- دخول إحدى الإدارات الثلاث، أصيلًا أو مكلَّفًا، ينهي كلّ ترشّحٍ قائم قبل التصويت (المادة ١٧).
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
        and e.archived_at is null and e.status in ('candidacy_open', 'candidacy_closed')
    loop
      perform public._end_candidacy(r.id, 'joined_admin', null, jsonb_build_object('role_row', new.id));
    end loop;
  end if;
  return new;
end;
$$;

create trigger user_roles_admin_entry_ends_candidacy after insert or update of is_active, role_name on public.user_roles
  for each row execute function public.end_candidacies_on_admin_entry();


-- ─── قوائم «القائم» في الدوالّ الأخرى: تشمل المجمَّد ─────────────────────

create or replace function public.set_seat_preference(p_department integer, p_preferred_election uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update election_candidates ec
     set preference_rank = case when e.id = p_preferred_election then 1 else 2 end
    from elections e
   where e.id = ec.election_id and ec.user_id = auth.uid()
     and election_department(e.id) = p_department and e.archived_at is null
     and e.status in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed')
     and public._is_live_candidacy(ec.status);

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  select e.id, auth.uid(), 'seat_preference_set', jsonb_build_object('preferred', e.id = p_preferred_election)
    from election_candidates ec join elections e on e.id = ec.election_id
   where ec.user_id = auth.uid() and election_department(e.id) = p_department and e.archived_at is null
     and e.status in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed')
     and public._is_live_candidacy(ec.status);
end;
$$;

create or replace function public.get_eligible_elections_for_user(p_user uuid default null)
returns table(election_id uuid, target_role_name text, target_committee_id integer, target_committee_ar text,
              target_department_id integer, target_department_ar text, candidacy_end timestamptz, has_submission boolean)
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
  select e.id, e.target_role_name, e.target_committee_id, c.committee_name_ar,
         e.target_department_id, d.name_ar, e.candidacy_end,
         exists (select 1 from election_candidates ec
                 where ec.election_id = e.id and ec.user_id = v_user and public._is_live_candidacy(ec.status)) as has_submission
  from elections e
  left join committees  c on c.id = e.target_committee_id
  left join departments d on d.id = e.target_department_id
  where e.status = 'candidacy_open' and e.archived_at is null
    and is_user_eligible_to_run(v_user, e.id) = true
  order by e.candidacy_end nulls last, e.created_at desc;
end;
$$;

-- ترشّحات العضو: مع المهلة وسبب الانتهاء والتجميد، وما يحقّ له فعله منها الآن.
drop function public.get_user_candidacies(uuid);

create function public.get_user_candidacies(p_user uuid default null)
returns table(candidate_id uuid, election_id uuid, election_status text, election_archived_at timestamptz,
              target_role_name text, target_committee_id integer, target_committee_ar text,
              target_department_id integer, target_department_ar text, candidate_number integer,
              candidate_status text, statement_ar text, file_url text, file_name text, review_note_ar text,
              reviewed_at timestamptz, submitted_at timestamptz, candidacy_end timestamptz,
              can_withdraw boolean, can_edit boolean,
              edit_due_at timestamptz, end_reason text, reject_reason text,
              freeze_id bigint, freeze_reason text, freeze_answer_due timestamptz, can_answer_freeze boolean)
language plpgsql
stable
security definer
set search_path = public, pg_temp
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
      raise exception 'ترشُّحُ غيرِك ليس لك أن تقرأه.' using errcode = '42501';
    end if;
  end if;
  if v_user is null then raise exception 'لم يُسمَّ صاحبُ الترشُّح.' using errcode = '42501'; end if;

  return query
  select ec.id, e.id, e.status, e.archived_at, e.target_role_name, e.target_committee_id, c.committee_name_ar,
         e.target_department_id, d.name_ar, ec.candidate_number, ec.status, ec.statement_ar, ec.file_url,
         ec.file_name, ec.review_note_ar, ec.reviewed_at, ec.submitted_at, e.candidacy_end,
         (public._is_live_candidacy(ec.status) and e.status in ('candidacy_open', 'candidacy_closed')
           and e.archived_at is null) as can_withdraw,
         ((ec.status = 'pending' and e.status = 'candidacy_open')
           or (ec.status = 'needs_edit' and ec.edit_due_at > now() and e.status in ('candidacy_open', 'candidacy_closed')))
           and e.archived_at is null as can_edit,
         ec.edit_due_at, ec.end_reason, ec.reject_reason,
         f.id, f.reason, f.answer_due,
         (f.status = 'active' and f.answer_due > now()) as can_answer_freeze
  from election_candidates ec
  join elections e on e.id = ec.election_id
  left join committees  c on c.id = e.target_committee_id
  left join departments d on d.id = e.target_department_id
  left join election_freezes f on f.candidate_id = ec.id and f.status in ('active', 'answered')
  where ec.user_id = v_user
  order by ec.submitted_at desc;
end;
$$;
grant execute on function public.get_user_candidacies(uuid) to authenticated;

-- الأهليّة (نسخة الدفعة الأولى)، والترشّح القائم في قسمٍ آخر يشمل المجمَّد.
-- الأهليّة نفسها تخدم بابين: الترشّح الجديد، والإرجاع (`p_restore`). وفي الإرجاع يكفي أن يكون
-- الانتخاب قبل التصويت، ولا يُحسب ترشّحه في هذا الانتخاب نفسه سابقةً تمنعه.
create or replace function public._run_eligibility(p_user uuid, p_election uuid, p_restore boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_election   elections%rowtype;
    v_dept       integer;
    v_blocks     boolean;
    v_in_scope   boolean;
    v_has_active boolean;
    v_has_prior  boolean;
    v_frozen     boolean;
begin
    select * into v_election from elections where id = p_election;
    if not found or v_election.archived_at is not null then return false; end if;
    if p_restore then
        if v_election.status not in ('candidacy_open', 'candidacy_closed') then return false; end if;
    elsif v_election.status <> 'candidacy_open' or v_election.stalled_at is not null then
        return false;
    end if;

    if exists (
        select 1 from user_roles ur join roles r on r.role_name = ur.role_name
        where ur.user_id = p_user and ur.is_active and r.council_type = 'administrative'
    ) then return false; end if;
    if not coalesce(check_user_permission(p_user, 'run_for_election'), false) then return false; end if;

    select exists (
        select 1 from user_roles f
        join user_roles a on a.id = f.frozen_by and a.is_active and a.is_acting
        where f.user_id = p_user
    ) into v_frozen;
    if v_frozen and not exists (
        select 1 from user_roles a
        where a.user_id = p_user and a.is_active and a.is_acting
          and a.role_name = v_election.target_role_name
          and a.committee_id  is not distinct from v_election.target_committee_id
          and a.department_id is not distinct from v_election.target_department_id
          and exists (select 1 from user_roles f where f.frozen_by = a.id)
    ) then return false; end if;

    if v_election.target_role_name = 'department_head' then
        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and not ur.is_acting
              and (ur.is_active or exists (select 1 from user_roles a where a.id = ur.frozen_by and a.is_active and a.is_acting))
              and ur.role_name = 'department_head'
        ) into v_blocks;
        if v_blocks then return false; end if;
        select exists (
            select 1 from user_roles ur left join committees c on c.id = ur.committee_id
            where ur.user_id = p_user and ur.is_active
              and (c.department_id = v_election.target_department_id
                   or (ur.role_name = 'department_head' and ur.department_id = v_election.target_department_id))
        ) into v_in_scope;
    elsif v_election.target_role_name = 'committee_leader' then
        select exists (
            select 1 from user_roles ur join committees c on c.id = v_election.target_committee_id
            where ur.user_id = p_user and not ur.is_acting
              and (ur.is_active or exists (select 1 from user_roles a where a.id = ur.frozen_by and a.is_active and a.is_acting))
              and ur.role_name = 'department_head' and ur.department_id = c.department_id
        ) into v_blocks;
        if v_blocks then return false; end if;
        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and not ur.is_acting
              and (ur.is_active or exists (select 1 from user_roles a where a.id = ur.frozen_by and a.is_active and a.is_acting))
              and ur.role_name = 'committee_leader' and ur.committee_id = v_election.target_committee_id
        ) into v_blocks;
        if v_blocks then return false; end if;
        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and ur.is_active and ur.committee_id = v_election.target_committee_id
        ) into v_in_scope;
    else
        select exists (
            select 1 from user_roles ur join committees c on c.id = v_election.target_committee_id
            where ur.user_id = p_user and not ur.is_acting
              and (ur.is_active or exists (select 1 from user_roles a where a.id = ur.frozen_by and a.is_active and a.is_acting))
              and ur.role_name = 'department_head' and ur.department_id = c.department_id
        ) into v_blocks;
        if v_blocks then return false; end if;
        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and not ur.is_acting
              and (ur.is_active or exists (select 1 from user_roles a where a.id = ur.frozen_by and a.is_active and a.is_acting))
              and ur.role_name in ('committee_leader', 'deputy_committee_leader')
              and ur.committee_id = v_election.target_committee_id
        ) into v_blocks;
        if v_blocks then return false; end if;
        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and ur.is_active and ur.committee_id = v_election.target_committee_id
        ) into v_in_scope;
    end if;

    if not coalesce(v_in_scope, false) then return false; end if;

    if not p_restore then
        select exists (
            select 1 from election_candidates ec where ec.election_id = p_election and ec.user_id = p_user
        ) into v_has_prior;
        if v_has_prior then return false; end if;
    end if;

    v_dept := election_department(p_election);
    select exists (
        select 1 from election_candidates ec join elections e on e.id = ec.election_id
        where ec.user_id = p_user and public._is_live_candidacy(ec.status)
          and e.archived_at is null
          and e.status in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed')
          and e.id <> p_election
          and election_department(e.id) is distinct from v_dept
    ) into v_has_active;

    return not v_has_active;
end;
$$;
revoke execute on function public._run_eligibility(uuid, uuid, boolean) from public, anon, authenticated;

create or replace function public.is_user_eligible_to_run(p_user uuid, p_election uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public._run_eligibility(p_user, p_election, false);
$$;

-- يلتقط المحفّز التجميد بالتكليف ولو كُتب `frozen_by` وحده.
drop trigger user_roles_cascade_candidacy on public.user_roles;
create trigger user_roles_cascade_candidacy after update of is_active, frozen_by on public.user_roles
  for each row execute function public.cascade_membership_loss_to_candidacy();


-- ─── ما يراه المرشّح من رحلته، وشارة بابه ─────────────────────────────────

-- رحلة الترشّح لصاحبه ولمن يدير الانتخاب، ومعها أحداث هذه الدفعة. ولا يرى المرشّح من طلب
-- تجميده من أعضاء الموارد (المادة ٥)، ولا الطلبات التي لم يُوافَق عليها.
create or replace function public.get_candidate_audit_trail(p_candidate uuid)
returns table(event_type text, payload jsonb, actor_name text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user     uuid;
  v_election uuid;
begin
  select user_id, election_id into v_user, v_election from election_candidates where id = p_candidate;
  if v_user is null then return; end if;
  if auth.uid() is distinct from v_user and not public._can_manage_election(auth.uid(), v_election) then return; end if;

  return query
  select l.event_type, l.payload - 'requested_by', p.full_name, l.created_at
  from election_audit_log l
  left join profiles p on p.id = l.actor_id
  where l.election_id = v_election
    and l.event_type in ('candidacy_submitted', 'candidate_reviewed', 'candidate_resubmitted', 'candidate_updated',
                         'candidate_withdrawn', 'candidate_restored', 'candidate_frozen', 'freeze_answered',
                         'freeze_lifted', 'candidacy_ended')
    and (l.payload ->> 'candidate_id')::uuid = p_candidate
  order by l.created_at asc, l.id asc;
end;
$$;

create or replace function public.count_user_election_tabs(p_user uuid default null)
returns table(can_run integer, has_submission integer, can_vote integer, can_view integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_self uuid := auth.uid();
  v_user uuid;
  v_can_run  integer := 0;
  v_has_sub  integer := 0;
  v_can_vote integer := 0;
  v_can_view integer := 0;
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

  select count(*) into v_can_run from elections e
   where e.status = 'candidacy_open' and e.archived_at is null and is_user_eligible_to_run(v_user, e.id);

  select count(*) into v_has_sub
    from election_candidates ec join elections e on e.id = ec.election_id
   where ec.user_id = v_user
     and ec.status in ('pending', 'approved', 'needs_edit', 'frozen', 'withdrawn', 'rejected', 'ended')
     and e.archived_at is null
     and e.status in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed', 'completed');

  select count(*) into v_can_vote from elections e
   where e.status = 'voting_open' and e.archived_at is null
     and is_user_eligible_to_vote(v_user, e.id)
     and not is_sole_candidate(v_user, e.id)
     and not exists (select 1 from election_votes v where v.election_id = e.id and v.voter_id = v_user);

  select count(*) into v_can_view from elections e
   where e.archived_at is null
     and e.status in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed', 'completed')
     and has_election_view_permission(v_user, e.id);

  return query select v_can_run, v_has_sub, v_can_vote, v_can_view;
end;
$$;

-- هويّات المرشّحين لمن يدير الانتخاب ويطّلع عليه، بترتيب التقدّم لا بالرقم (المادة ١٣).
create or replace function public.get_candidates_with_identity(p_election uuid)
returns table(candidate_id uuid, candidate_number integer, user_id uuid, full_name text, username text, avatar_url text,
              statement_ar text, file_url text, file_name text, file_size_bytes integer, file_mime text, status text,
              review_note_ar text, reviewed_by uuid, reviewed_at timestamptz, withdrawn_at timestamptz,
              submitted_at timestamptz, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_full boolean;
begin
  v_full := public._can_manage_election(v_uid, p_election)
         or has_election_view_permission(v_uid, p_election)
         or coalesce(auth.role(), '') = 'service_role';

  if not v_full and not exists (
       select 1 from election_candidates ec where ec.election_id = p_election and ec.user_id = v_uid) then
    raise exception 'غير مصرح برؤية بيانات المرشحين';
  end if;

  return query
  select ec.id, ec.candidate_number, ec.user_id, p.full_name, p.username, p.avatar_url,
         ec.statement_ar, ec.file_url, ec.file_name, ec.file_size_bytes, ec.file_mime,
         ec.status, ec.review_note_ar, ec.reviewed_by, ec.reviewed_at, ec.withdrawn_at,
         ec.submitted_at, ec.updated_at
  from election_candidates ec
  join profiles p on p.id = ec.user_id
  where ec.election_id = p_election and (v_full or ec.user_id = v_uid)
  order by ec.submitted_at, ec.id;
end;
$$;
