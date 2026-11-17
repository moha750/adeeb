-- ═══════════════════════════════════════════════════════════════════════════
-- الانتخابات على الإصدار الثاني من نظامها، الدفعة الأولى: الأساس (2026-11-16)
--
-- المرجع: نظام الانتخابات (الإصدار الثاني) والدستور (47 و49)، وقرارات محمد في
-- وثيقة المشروع `elections-target.md`. لا يُطبَّق إلا بإذنه.
--
-- ما فيها:
--   (١) لا يُحذف من سجلّ الانتخابات شيء (المادة ٦).
--   (٢) مشرف اللجنة يدير انتخاب قيادتها ونيابتها، إلا التعيين والتكليف (المادتان ٢ و٤).
--   (٣) الفتح، وتعديل المواعيد، والإغلاق المبكّر، وإعادة الفتح، والإلغاء: كلّها بدالّةٍ
--       تقيّد فاعلها وسببها (المواد ٦ و٨ و٢٣ و٢٤ و٢٩). ولا حدّ أدنى لمدّة.
--   (٤) الانسحاب بيد المرشّح وحده (المادة ١٥). والأرشفة لمن يدير الانتخاب.
--   (٤ب) لكلّ بابٍ مفتوح موعد، ولا يُترشَّح في مقعدٍ متعثّر حتى يُعاد فتحه (المادتان ٢٣ و٢٥).
--   (٥) أهليّة المكلَّف: يترشّح للمقعد المكلَّف به، ويُقاس «دون منصبه» بالأصيل ساريًا أو
--       مجمَّدًا (المادتان ٩ و١٠).
--   (٦) إسقاط بابين مفتوحين لا يناديهما التطبيق، وإغلاق دوالّ الانتخاب عن غير المسجّلين.
--
-- يُطبَّق مع نشر التطبيق في وقتٍ واحد: أبواب الإغلاق وإعادة الفتح في التطبيق المنشور اليوم
-- لا ترسل السبب، فتُرفض بعده. ولا انتخاب قائمًا يوم كتابته.
--
-- ما ليس فيها (دفعاتٌ تالية): الإشعارات، والرؤية أثناء الترشّح، وأجل التعديل، والتجميد،
-- والإغلاق الآليّ والإعلان الآليّ، والتعادل، والتعثّر بعد التصويت.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── (١) لا حذف ─────────────────────────────────────────────────────────────
-- كانت المفاتيح الأربعة ON DELETE CASCADE: حذفُ انتخابٍ واحد يمحو مرشّحيه وأصواته وسجلّه
-- معًا. وقد حدث ذلك في 2026-11-15 لانتخابين. فتصير RESTRICT، ويرفض محفّزٌ الحذفَ نفسه
-- ولو بمفتاح الخدمة.

alter table public.election_candidates drop constraint election_candidates_election_id_fkey;
alter table public.election_candidates add constraint election_candidates_election_id_fkey
  foreign key (election_id) references public.elections(id) on delete restrict;

alter table public.election_votes drop constraint election_votes_election_id_fkey;
alter table public.election_votes add constraint election_votes_election_id_fkey
  foreign key (election_id) references public.elections(id) on delete restrict;

alter table public.election_audit_log drop constraint election_audit_log_election_id_fkey;
alter table public.election_audit_log add constraint election_audit_log_election_id_fkey
  foreign key (election_id) references public.elections(id) on delete restrict;

-- الجدول القديم للإشعارات (لا يقرؤه التطبيق) يُلحق بالحكم نفسه حتى يُحسم مصيره.
alter table public.notifications drop constraint notifications_target_election_id_fkey;
alter table public.notifications add constraint notifications_target_election_id_fkey
  foreign key (target_election_id) references public.elections(id) on delete restrict;

create or replace function public.forbid_election_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'لا يُحذف من سجلّ الانتخابات شيء: يُلغى الانتخاب بسببٍ مكتوب ويبقى سجلّه (نظام الانتخابات، المادة 6)'
    using errcode = '42501';
end;
$$;

create trigger elections_no_delete before delete on public.elections
  for each row execute function public.forbid_election_delete();
create trigger elections_no_truncate before truncate on public.elections
  for each statement execute function public.forbid_election_delete();

create trigger candidates_no_delete before delete on public.election_candidates
  for each row execute function public.forbid_election_delete();
create trigger candidates_no_truncate before truncate on public.election_candidates
  for each statement execute function public.forbid_election_delete();

create trigger election_log_no_delete before delete on public.election_audit_log
  for each row execute function public.forbid_election_delete();
create trigger election_log_no_truncate before truncate on public.election_audit_log
  for each statement execute function public.forbid_election_delete();

-- الأصواتُ يمنع حذفَها صفًّا صفًّا `votes_immutable_del` من قبل؛ ويُضاف الإفراغ.
create trigger votes_no_truncate before truncate on public.election_votes
  for each statement execute function public.forbid_election_delete();


-- ─── (٢) من يدير الانتخاب ───────────────────────────────────────────────────
-- مشرف اللجنة: عضوٌ حيّ في إدارة الموارد البشرية، أُسند إليه الإشراف على اللجنة في
-- `committee_supervision`، يوم الإجراء. ويدير انتخاب قيادتها ونيابتها، لا تنسيق القسم.
-- والإدارة تُعرف بدور عضوها (`hr_admin_member`) لا برقم صفّها.

create or replace function public._is_committee_supervisor(p_user uuid, p_committee integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user is not null and p_committee is not null and exists (
    select 1
    from committees hr
    join committee_supervision cs
      on cs.unit_id = hr.id and cs.committee_id = p_committee and cs.supervisor_id = p_user
    join user_roles ur
      on ur.user_id = p_user and ur.is_active
     and ur.role_name = 'hr_admin_member' and ur.committee_id = hr.id
    where hr.member_role_name = 'hr_admin_member'
  );
$$;

-- يأخذ الهويّة وسيطًا، فلا يُنادى إلا من داخل دوالّ القاعدة.
revoke execute on function public._is_committee_supervisor(uuid, integer) from public, anon, authenticated;

-- يدير الانتخابَ مديروه الثلاثة في كلّ انتخاب، ومشرفُ اللجنة في انتخاب قيادتها ونيابتها.
create or replace function public._can_manage_election(p_user uuid, p_election uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.has_election_admin_permission(p_user), false)
      or exists (
        select 1 from elections e
        where e.id = p_election
          and e.target_role_name in ('committee_leader', 'deputy_committee_leader')
          and public._is_committee_supervisor(p_user, e.target_committee_id)
      );
$$;

revoke execute on function public._can_manage_election(uuid, uuid) from public, anon, authenticated;

-- ومثله قبل أن يوجد صفّ الانتخاب: لفتحه.
create or replace function public._can_manage_scope(p_user uuid, p_role text, p_committee integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.has_election_admin_permission(p_user), false)
      or (p_role in ('committee_leader', 'deputy_committee_leader')
          and public._is_committee_supervisor(p_user, p_committee));
$$;

revoke execute on function public._can_manage_scope(uuid, text, integer) from public, anon, authenticated;

-- للتطبيق: هل يدير صاحب الجلسة هذا الانتخاب؟ الهويّة من الجلسة لا من النداء.
create or replace function public.can_manage_election(p_election uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public._can_manage_election(auth.uid(), p_election);
$$;
-- يناديها التطبيق بعميل الجلسة ليُظهر أزرار الإدارة للمشرف، فتُمنح للمسجّلين.
grant execute on function public.can_manage_election(uuid) to authenticated;

-- للتطبيق: اللجان التي يشرف عليها صاحب الجلسة، لنافذة «فتح انتخاب».
create or replace function public.my_supervised_committees()
returns setof integer
language sql
stable
security definer
set search_path = public
as $$
  select cs.committee_id
  from committees hr
  join committee_supervision cs on cs.unit_id = hr.id and cs.supervisor_id = auth.uid()
  where hr.member_role_name = 'hr_admin_member'
    and public._is_committee_supervisor(auth.uid(), cs.committee_id);
$$;
-- يناديها التطبيق بعميل الجلسة لقصر خيارات الفتح على لجان المشرف، فتُمنح للمسجّلين.
grant execute on function public.my_supervised_committees() to authenticated;


-- ─── (٣) الفتح والمواعيد والإغلاق والإلغاء ────────────────────────────────

-- فتح الانتخاب (المادة ٨). كان التطبيق يُدرج الصفّ بمفتاح الخدمة ولا يقيّد الفتح في السجلّ.
-- والموعد إلزاميّ عند الفتح، بلا حدٍّ أدنى (المادة ٢٣). وشروط المقعد (فراغه، وتفرّده،
-- وتجميده) تفرضها محفّزات `elections` كما هي.
create or replace function public.open_election(
  p_role text,
  p_committee integer,
  p_department integer,
  p_candidacy_end timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'سجّل الدخول ثمّ أعِد المحاولة' using errcode = '42501';
  end if;
  if not public._can_manage_scope(v_uid, p_role, p_committee) then
    raise exception 'لا تملك فتح انتخاب هذا المقعد' using errcode = '42501';
  end if;
  if p_candidacy_end is null or p_candidacy_end <= now() then
    raise exception 'اختر لإغلاق باب الترشّح موعدًا في المستقبل (المادة 8)';
  end if;

  insert into elections (target_role_name, target_committee_id, target_department_id, candidacy_end, created_by)
  values (p_role, p_committee, p_department, p_candidacy_end, v_uid)
  returning id into v_id;

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_id, v_uid, 'election_opened', jsonb_build_object('candidacy_end', p_candidacy_end));

  return v_id;
end;
$$;
-- يناديها التطبيق بعميل الجلسة بدل الإدراج بمفتاح الخدمة، فتُمنح للمسجّلين، وحارسها في داخلها.
grant execute on function public.open_election(text, integer, integer, timestamptz) to authenticated;

-- تعديل موعد الإغلاق والباب مفتوح، تأخيرًا أو تقديمًا، بسببٍ مكتوب (المادة ٢٣).
-- وفي المقعد المتعثّر بلا ترشّح، الموعدُ الجديد هو إعادة فتح الباب (المادة ٢٥).
-- ولا يُرفع الموعد: لكلّ بابٍ مفتوح موعد.
create or replace function public.set_election_deadline(
  p_election uuid,
  p_end timestamptz,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_e      elections%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_old    timestamptz;
  v_phase  text;
  v_event  text := 'deadline_changed';
begin
  if not public._can_manage_election(v_uid, p_election) then
    raise exception 'غير مصرح بتعديل مواعيد هذا الانتخاب' using errcode = '42501';
  end if;

  select * into v_e from elections where id = p_election for update;
  if not found then raise exception 'الانتخاب غير موجود'; end if;
  if v_e.archived_at is not null then raise exception 'الانتخاب مؤرشف'; end if;

  if p_end is null or p_end <= now() then
    raise exception 'اختر موعدًا في المستقبل';
  end if;
  if v_reason is null or char_length(v_reason) < 10 then
    raise exception 'اكتب سبب تعديل الموعد (10 أحرف على الأقلّ)، فيُبلَّغ به ناخبو المقعد (المادة 23)';
  end if;

  if v_e.status = 'candidacy_open' then
    v_phase := 'candidacy';
    v_old   := v_e.candidacy_end;
    if v_e.stalled_at is not null then v_event := 'candidacy_reopened'; end if;
    update elections set candidacy_end = p_end, stalled_at = null where id = p_election;
  elsif v_e.status = 'voting_open' then
    v_phase := 'voting';
    v_old   := v_e.voting_end;
    update elections set voting_end = p_end where id = p_election;
  else
    raise exception 'لا موعدَ إلا لبابٍ مفتوح: ترشّحًا أو تصويتًا';
  end if;

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (p_election, v_uid, v_event,
          jsonb_build_object('phase', v_phase, 'old_end', v_old, 'new_end', p_end, 'reason', v_reason));
end;
$$;
-- يناديها التطبيق بعميل الجلسة بدل التحديث بمفتاح الخدمة، فتُمنح للمسجّلين، وحارسها في داخلها.
grant execute on function public.set_election_deadline(uuid, timestamptz, text) to authenticated;

-- الانتقال بين المراحل بيد من يدير الانتخاب. والجديد:
--   • الإغلاق المبكّر للترشّح أو التصويت يلزمه سبب (المادة ٢٣)، ولا يُغلق الترشّح إلا وفيه
--     ترشّح قائم (المادة ٢٤).
--   • إعادة فتح الترشّح يلزمها موعدٌ جديد وسبب (المادتان ٢٣ و٢٥).
--   • فتح التصويت يلزمه موعد إغلاق، بلا حدٍّ أدنى.
--   • لا إلغاء ولا إكمال من هنا: للإلغاء دالّته بسببه، والإكمال بإعلان الفائز.
-- ويبقى اسم الوسيط `p_voting_end` فيبقى نداء التطبيق القائم صحيحًا.
drop function public.transition_election(uuid, text, timestamptz);

create function public.transition_election(
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
    raise exception 'يكتمل الانتخاب بإعلان فائزه، لا بتغيير حالته';
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
       set status = 'candidacy_open', candidacy_end = p_candidacy_end, stalled_at = null
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
    perform public._finalize_confidence(p_election);
  end if;
end;
$$;
-- يناديها التطبيق بعميل الجلسة، وحارسها في داخلها.
grant execute on function public.transition_election(uuid, text, timestamptz, text, timestamptz) to authenticated;

-- الإلغاء بقرارٍ مكتوب بسببه (المادة ٢٩). كان السبب اختياريًّا في القاعدة.
create or replace function public.cancel_election(p_election uuid, p_reason text default null)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status                text;
  v_reason                text := nullif(btrim(coalesce(p_reason, '')), '');
  v_votes_preserved       int := 0;
  v_candidates_preserved  int := 0;
  v_files_preserved       int := 0;
begin
  if not public._can_manage_election(auth.uid(), p_election) then
    raise exception 'غير مصرح بإلغاء الانتخاب' using errcode = '42501';
  end if;

  select status into v_status from elections where id = p_election for update;
  if v_status is null then raise exception 'الانتخاب غير موجود'; end if;
  if v_status = 'completed' then raise exception 'لا يمكن إلغاء انتخاب مكتمل'; end if;
  if v_status = 'cancelled' then raise exception 'الانتخاب ملغًى من قبل'; end if;
  if v_reason is null or char_length(v_reason) < 10 then
    raise exception 'اكتب سبب الإلغاء (10 أحرف على الأقلّ) (المادة 29)';
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
         stalled_at          = null,
         archived_at         = coalesce(archived_at, now())
   where id = p_election;

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (p_election, auth.uid(), 'cancelled',
          jsonb_build_object(
            'reason',               v_reason,
            'votes_preserved',      v_votes_preserved,
            'candidates_preserved', v_candidates_preserved,
            'files_preserved',      v_files_preserved));

  return '{}'::text[];
end;
$$;


-- الأرشفة لمن يدير الانتخاب.
create or replace function public.archive_election(p_election uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status   text;
  v_archived timestamptz;
begin
  if not public._can_manage_election(auth.uid(), p_election) then
    raise exception 'غير مصرح بأرشفة الانتخاب' using errcode = '42501';
  end if;

  select status, archived_at into v_status, v_archived from elections where id = p_election;
  if not found then raise exception 'الانتخاب غير موجود'; end if;
  if v_archived is not null then raise exception 'الانتخاب مؤرشف مسبقاً'; end if;
  if v_status not in ('completed', 'cancelled') then
    raise exception 'يمكن أرشفة الانتخابات المكتملة أو الملغاة فقط';
  end if;

  update elections set archived_at = now() where id = p_election;

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (p_election, auth.uid(), 'archived', '{}'::jsonb);
end;
$$;

-- لكلّ بابٍ مفتوح موعد (المادتان ٨ و٢٣)، يفرضه محفّزٌ على كلّ كاتب، ومفتاحُ الخدمة منه.
-- والمقعد المتعثّر في الترشّح يبقى بموعده الذي حلّ حتى يُعاد فتحه بموعدٍ جديد.
create or replace function public.enforce_open_deadline()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'candidacy_open' and new.candidacy_end is null then
    raise exception 'لا يُفتح باب الترشّح بلا موعد إغلاق (المادة 23)';
  end if;
  if new.status = 'voting_open' and new.voting_end is null then
    raise exception 'لا يُفتح التصويت بلا موعد إغلاق (المادة 23)';
  end if;
  return new;
end;
$$;

create trigger elections_open_deadline before insert or update on public.elections
  for each row execute function public.enforce_open_deadline();

-- كان الترشّح في مقعدٍ متعثّر يرفع تعثّره ويمحو موعده، فيبقى الباب مفتوحًا بلا موعد.
-- وصار المتعثّر لا يُترشَّح فيه حتى يُعاد فتحه (أهليّة الترشّح أدناه)، فلا عمل للمحفّز.
drop trigger candidates_clear_stall on public.election_candidates;
drop function public.clear_stall_on_candidacy();


-- ─── المراجعة والإرجاع: لمن يدير الانتخاب ───────────────────────────────────

create or replace function public.review_candidate(p_candidate uuid, p_new_status text, p_note_ar text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election uuid;
begin
  select election_id into v_election from election_candidates where id = p_candidate;
  if v_election is null then raise exception 'المرشح غير موجود'; end if;

  if not public._can_manage_election(auth.uid(), v_election) then
    raise exception 'غير مصرح بمراجعة المرشحين' using errcode = '42501';
  end if;
  if p_new_status not in ('approved', 'rejected', 'needs_edit') then
    raise exception 'قيمة حالة المرشح غير مدعومة في المراجعة';
  end if;

  update election_candidates
     set status = p_new_status, review_note_ar = p_note_ar, reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_candidate;

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_election, auth.uid(), 'candidate_reviewed',
          jsonb_build_object('candidate_id', p_candidate, 'new_status', p_new_status, 'note', p_note_ar));
end;
$$;

create or replace function public.restore_candidacy(p_candidate uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election uuid;
  v_status   text;
begin
  select election_id, status into v_election, v_status from election_candidates where id = p_candidate;
  if v_election is null then raise exception 'الترشح غير موجود'; end if;

  if not public._can_manage_election(auth.uid(), v_election) then
    raise exception 'غير مصرح بإرجاع المرشحين' using errcode = '42501';
  end if;
  if v_status <> 'withdrawn' then raise exception 'هذا الترشح ليس منسحبا'; end if;

  -- إلى «قيد المراجعة» لا إلى ما كان عليه (اختيار المالك): يعود إلى الصفّ لا إلى الصندوق.
  update election_candidates set status = 'pending' where id = p_candidate;

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_election, auth.uid(), 'candidate_restored',
          jsonb_build_object('candidate_id', p_candidate, 'new_status', 'pending'));
end;
$$;

-- الانسحاب بيد المرشّح وحده (المادة ١٥). كان للمدير أن يسحب أيّ ترشّح بلا طلبٍ ولا سبب.
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

  insert into election_audit_log (election_id, actor_id, event_type, payload)
  values (v_election, auth.uid(), 'candidate_withdrawn', jsonb_build_object('candidate_id', p_candidate));
end;
$$;

-- المحفّزان يفرضان المراجعة والإرجاع لمن يدير الانتخاب ولو نودي الجدول مباشرة.
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
begin
  if old.status = new.status then return new; end if;

  select status into v_election_status from elections where id = new.election_id;
  v_manager := public._can_manage_election(auth.uid(), new.election_id)
            or coalesce(auth.role(), '') = 'service_role';

  if new.status = 'withdrawn' and old.status in ('pending', 'approved', 'needs_edit') then
    if v_election_status in ('candidacy_open', 'candidacy_closed') then
      v_ok := true;
    else
      raise exception 'لا يمكن الانسحاب بعد فتح التصويت';
    end if;

  elsif old.status = 'withdrawn' and new.status = 'pending' then
    if not public._can_manage_election(auth.uid(), new.election_id) then
      raise exception 'إرجاع المنسحب بيد من يدير الانتخاب وحده' using errcode = '42501';
    end if;
    if v_election_status not in ('candidacy_open', 'candidacy_closed') then
      raise exception 'لا يُرجع مرشح بعد فتح التصويت';
    end if;
    v_ok := true;
    new.withdrawn_at := null;

  elsif old.status = 'pending' and new.status in ('approved', 'rejected', 'needs_edit') then
    -- المراجعة بيد من يدير الانتخاب (المادة ١٤)، تُفرض هنا لا في الباب وحده:
    -- فلا يعتمد مرشّحٌ ترشّحَه بنداءٍ مباشر (ثغرة 2026-10-10).
    if not v_manager then
      raise exception 'مراجعة الترشّح بيد من يدير الانتخاب وحده' using errcode = '42501';
    end if;
    v_ok := true;

  elsif old.status = 'needs_edit' and new.status = 'pending' then
    v_ok := true;

  elsif old.status = 'rejected' or old.status = 'withdrawn' then
    raise exception 'هذه الحالة نهائية: %', old.status;
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

  if new.status = 'approved' then
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;

  if new.status = 'withdrawn' then
    new.withdrawn_at := coalesce(new.withdrawn_at, now());
  end if;

  return new;
end;
$$;

create or replace function public.guard_candidacy_writes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending'
       and not (public._can_manage_election(auth.uid(), new.election_id)
                or coalesce(auth.role(), '') = 'service_role') then
      raise exception 'الترشّحُ يبدأ قيدَ المراجعة' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.status = 'approved' and new.status = 'approved'
     and (new.statement_ar is distinct from old.statement_ar
       or new.file_url     is distinct from old.file_url
       or new.file_name    is distinct from old.file_name
       or new.user_id      is distinct from old.user_id
       or new.election_id  is distinct from old.election_id) then
    raise exception 'المعتمَدُ لا يُعدَّل' using errcode = '42501';
  end if;
  return new;
end;
$$;


-- ─── (٥) أهليّة الترشّح: المكلَّف كالأصيل ─────────────────────────────────
-- ثلاثة تصحيحات على ما في القاعدة:
--   • قيود «دون منصبه» تُقرأ من المنصب الأصيل وحده (`not is_acting`)، ساريًا كان أو مجمَّدًا
--     بتكليفٍ حيّ (قرار محمد 2026-11-16: المجمَّد داخلٌ في المادة ١٠). كان المكلَّف بنيابة
--     لجنةٍ يُردّ عن انتخاب نيابتها نفسها، والمادة ٩ تقول: «ويترشّح المكلَّف بالمقعد له».
--     وكان العضو المكلَّف بقيادة لجنته يُردّ عن نيابتها، وأصيلُه عضو (المادة ١٠).
--   • من جُمّد أصيلُه بتكليفٍ حيّ لا يترشّح إلا لمقعد تكليفه (المادة ٩)، ولا يكون دون أصيله.
--     والأصيل المجمَّد صفّه `is_active = false` و`frozen_by` = صفّ التكليف.
--   • النطاق يبقى بكلّ منصبٍ حيّ، أصيلًا كان أو تكليفًا (المادة ٩: «أصيلًا كان المنصب أو تكليفًا»).
create or replace function public.is_user_eligible_to_run(p_user uuid, p_election uuid)
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
    -- والمقعد المتعثّر لا يُترشَّح فيه حتى يُعاد فتح بابه بموعدٍ جديد وسبب (المادة ٢٥).
    if not found or v_election.status <> 'candidacy_open' or v_election.archived_at is not null
       or v_election.stalled_at is not null then
        return false;
    end if;

    -- (أ) لا يترشّح عضو المجلس الإداريّ ولا أعضاء الإدارات، أصيلًا أو مكلَّفًا (الدستور ٤٥).
    if exists (
        select 1 from user_roles ur join roles r on r.role_name = ur.role_name
        where ur.user_id = p_user and ur.is_active and r.council_type = 'administrative'
    ) then return false; end if;
    if not coalesce(check_user_permission(p_user, 'run_for_election'), false) then return false; end if;

    -- (ب) من جُمّد أصيلُه بتكليفٍ حيّ: لا يترشّح إلا لمقعد تكليفه.
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

    -- (ج) قيود «دون منصبه الأصيل» (المادة ١٠)، ثمّ النطاق بكلّ منصبٍ حيّ.
    if v_election.target_role_name = 'department_head' then
        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and not ur.is_acting
              and (ur.is_active or exists (select 1 from user_roles a where a.id = ur.frozen_by and a.is_active and a.is_acting))
              and ur.role_name = 'department_head'
        ) into v_blocks;
        if v_blocks then return false; end if;

        -- منصبٌ حيّ في إحدى لجان القسم، أو تنسيقُ القسم نفسه بالتكليف (لا لجنة لصفّه).
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

    else -- deputy_committee_leader
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

    -- (د) لا ترشّح سابق على هذا الانتخاب بعينه (المادة ١٠).
    select exists (
        select 1 from election_candidates ec
        where ec.election_id = p_election and ec.user_id = p_user
    ) into v_has_prior;
    if v_has_prior then return false; end if;

    -- (هـ) ولا ترشّح قائم في قسمٍ آخر. أمّا داخل القسم الواحد فيُجمع (المادة ٢٧).
    v_dept := election_department(p_election);
    select exists (
        select 1 from election_candidates ec join elections e on e.id = ec.election_id
        where ec.user_id = p_user and ec.status in ('pending', 'approved', 'needs_edit')
          and e.archived_at is null
          and e.status in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed')
          and e.id <> p_election
          and election_department(e.id) is distinct from v_dept
    ) into v_has_active;

    return not v_has_active;
end;
$$;


-- ─── (٦) بابان مفتوحان، ودوالّ الانتخاب لغير المسجّلين ──────────────────────
-- الثلاثيّة تُسند المقعد إسنادًا دائمًا وتُلغي الانتخاب، ومفتوحةٌ لـ`anon`. والخماسيّة
-- هي التي يناديها التطبيق. والإغلاق القسريّ يُغلق الترشّح بلا ترشّحٍ ولا سبب.
drop function public.appoint_to_seat(uuid, uuid, text);
drop function public.admin_force_close_candidacy(uuid, text);

-- دوالّ ينادِيها المسجّلون وحدهم، وكانت ممنوحةً لـ`PUBLIC` و`anon` من قبل قاعدة «تولد مغلقة».
-- حرّاسها في داخلها، فلا ثغرة اليوم، لكنّها لا تُنادى إلا بجلسة.
revoke execute on function public.cancel_election(uuid, text)            from public, anon;
revoke execute on function public.review_candidate(uuid, text, text)     from public, anon;
revoke execute on function public.restore_candidacy(uuid)                from public, anon;
revoke execute on function public.withdraw_candidacy(uuid)               from public, anon;
revoke execute on function public.declare_winner(uuid, uuid)             from public, anon;
revoke execute on function public.archive_election(uuid)                 from public, anon;
revoke execute on function public.resolve_department_election_winners(integer) from public, anon;
revoke execute on function public.set_seat_preference(integer, uuid)     from public, anon;
revoke execute on function public.cast_vote(uuid, uuid, text)            from public, anon;
revoke execute on function public.submit_candidacy(uuid, text, text, text, integer, text)   from public, anon;
revoke execute on function public.resubmit_candidacy(uuid, text, text, text, integer, text) from public, anon;

grant execute on function public.cancel_election(uuid, text)            to authenticated;
grant execute on function public.review_candidate(uuid, text, text)     to authenticated;
grant execute on function public.restore_candidacy(uuid)                to authenticated;
grant execute on function public.withdraw_candidacy(uuid)               to authenticated;
grant execute on function public.declare_winner(uuid, uuid)             to authenticated;
grant execute on function public.archive_election(uuid)                 to authenticated;
grant execute on function public.resolve_department_election_winners(integer) to authenticated;
grant execute on function public.set_seat_preference(integer, uuid)     to authenticated;
grant execute on function public.cast_vote(uuid, uuid, text)            to authenticated;
grant execute on function public.submit_candidacy(uuid, text, text, text, integer, text)   to authenticated;
grant execute on function public.resubmit_candidacy(uuid, text, text, text, integer, text) to authenticated;
