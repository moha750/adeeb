-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260802061636   الاسم: member_warnings_core

-- نظام الإنذارات — النواة (٢٠٢٦-٠٨-٠٢). المنهجيّة في v2/WARNINGS-SYSTEM.md
--
-- إنذارٌ يصدره صاحب سلطةٍ على عضوٍ بسببٍ مكتوب. الحدّ ثلاثةٌ سارية ⇐ تُسحب العضويّة فورًا.
-- ورقم الإنذار (الأوّل/الثاني/الثالث) **مشتقٌّ لا مخزَّن**: ترتيبه بين سواري صاحبه زمنيًّا،
-- فإلغاءُ الأوّل يجعل الثاني أوّلًا — الحقيقة هي الحالة الراهنة لا لقطةٌ قديمة.

create table if not exists public.member_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  issued_by uuid not null references public.profiles(id) on delete restrict,
  -- لقطتان: العضو ينتقل ويتغيّر منصبه، والسجلّ يقول أين وقع الأمر **يومَها** لا اليوم
  committee_id integer references public.committees(id) on delete set null,
  role_at_issue text references public.roles(role_name) on delete set null,
  category text not null check (category in ('absence','lateness','task_neglect','unresponsive','conduct','policy','other')),
  reason text not null check (char_length(btrim(reason)) >= 5),
  occurred_on date,
  status text not null default 'active' check (status in ('active','cancelled')),
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  cancel_reason text,
  -- هذا هو الذي بلغ الحدّ فسُحبت به العضويّة — فالأثر مربوطٌ بسببه
  caused_termination boolean not null default false,
  created_at timestamptz not null default now(),
  constraint member_warnings_not_self check (issued_by <> user_id),
  constraint member_warnings_cancel_shape check (
    (status = 'active' and cancelled_by is null and cancelled_at is null and cancel_reason is null)
    or (status = 'cancelled' and cancelled_at is not null and char_length(btrim(coalesce(cancel_reason,''))) >= 5)
  )
);

comment on table public.member_warnings is 'إنذارات الأعضاء — سجلّ إدارة الموارد البشريّة. لا يُكتب إلّا عبر issue_warning و cancel_warning.';

create index if not exists member_warnings_user_idx on public.member_warnings (user_id, status, created_at);
create index if not exists member_warnings_issuer_idx on public.member_warnings (issued_by);

-- الحدّ رقمٌ في مكانٍ واحد تقرؤه القاعدة والواجهة معًا
create or replace function public.warning_limit() returns integer
  language sql immutable as $$ select 3 $$;

/* ── الحَكَمان: الرؤية والإصدار ───────────────────────────────────────────
   المدى من `membership_authority` (نفس حَكَم الإنهاء والتعديل)، والقدرةُ من الصلاحيات:
   `view_warnings` بابُ الغرفة، و`manage_warnings` الفعلُ داخلها. ولكلٍّ إنذاراتُ نفسه. */

create or replace function public.can_view_warnings_of(p_actor uuid, p_target uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select p_actor is not null and (
    p_actor = p_target
    or (check_user_permission(p_actor, 'view_warnings') and member_within_reach(p_actor, p_target))
  );
$$;

create or replace function public.can_issue_warning(p_actor uuid, p_target uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select p_actor is distinct from p_target
     and check_user_permission(p_actor, 'manage_warnings')
     and member_within_reach(p_actor, p_target);
$$;

/* ── كاتبُ الحالة الواحد ──────────────────────────────────────────────────
   نواةُ إنهاء العضويّة استُخرجت من `terminate_membership` كي لا تُنسَخ كتابةُ الحالة في
   مكانين: تكتبها الدالّةُ بعد فحص سلطتها، ويكتبها `issue_warning` بعد بلوغ الحدّ —
   لأنّ السحب عند الحدّ **حكمُ اللائحة لا سلطةُ شخص**. والسجلّ يُميّز المصدر. */

create or replace function public._apply_termination(p_actor uuid, p_user uuid, p_reason text, p_source text)
 returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  perform set_config('app.membership_gate', 'open', true);
  update profiles
  set account_status = 'suspended', termination_reason = p_reason, updated_at = now()
  where id = p_user;
  perform set_config('app.membership_gate', '', true);

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'terminate_membership', 'profile', p_user::text,
          jsonb_build_object('reason', p_reason, 'source', p_source));
end;
$$;

revoke all on function public._apply_termination(uuid, uuid, text, text) from public, anon, authenticated;

create or replace function public.terminate_membership(p_actor uuid, p_user uuid, p_reason text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status text;
begin
  select account_status into v_status from profiles where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;
  if v_status = 'suspended' then
    return jsonb_build_object('ok', false, 'code', 'ALREADY', 'message', 'عضويّته منتهية أصلًا.');
  end if;

  if p_actor = p_user then
    return jsonb_build_object('ok', false, 'code', 'SELF', 'message', 'لا تُنهي عضويّتك بنفسك.');
  end if;
  if not can_end_membership(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ عضويّة هذا العضو — لا تُنهي إلّا عضويّة من تملك نزع مناصبه.');
  end if;

  if v_reason is null or char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'اذكر سبب إنهاء العضوية (خمسة أحرف فأكثر).');
  end if;

  perform _apply_termination(p_actor, p_user, v_reason, 'authority');

  return jsonb_build_object('ok', true, 'message', 'أُنهيت العضوية.');
end;
$$;

/* ── الإصدار ─────────────────────────────────────────────────────────────── */

create or replace function public.issue_warning(
  p_actor uuid, p_user uuid, p_category text, p_reason text,
  p_committee integer default null, p_occurred date default null
) returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status text;
  v_role text;
  v_committee integer := p_committee;
  v_id uuid;
  v_count integer;
  v_limit integer := warning_limit();
  v_terminated boolean := false;
begin
  select account_status into v_status from profiles where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;
  if v_status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'NOT_ACTIVE',
      'message', 'لا يُنذَر إلّا عضوٌ عضويّته سارية.');
  end if;

  if not can_issue_warning(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ إنذار هذا العضو.');
  end if;

  if p_category is null or p_category not in
     ('absence','lateness','task_neglect','unresponsive','conduct','policy','other') then
    return jsonb_build_object('ok', false, 'code', 'BAD_CATEGORY', 'message', 'اختر تصنيف المخالفة.');
  end if;
  if v_reason is null or char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED',
      'message', 'اكتب سبب الإنذار (خمسة أحرف فأكثر).');
  end if;

  -- لقطة الموقع: اللجنة المذكورة إن صحّت، وإلّا لجنةُ دوره الحيّ إن كانت واحدة
  select ur.role_name, coalesce(v_committee, ur.committee_id)
  into v_role, v_committee
  from user_roles ur
  where ur.user_id = p_user and ur.is_active
    and (v_committee is null or ur.committee_id = v_committee)
  order by (ur.committee_id is not null) desc, ur.assigned_at
  limit 1;

  insert into member_warnings (user_id, issued_by, committee_id, role_at_issue, category, reason, occurred_on)
  values (p_user, p_actor, v_committee, v_role, p_category, v_reason, p_occurred)
  returning id into v_id;

  select count(*) into v_count from member_warnings
  where user_id = p_user and status = 'active';

  if v_count >= v_limit then
    update member_warnings set caused_termination = true where id = v_id;
    perform _apply_termination(
      p_actor, p_user,
      format('بلوغ حدّ الإنذارات (%s) — آخرها: %s', v_limit, v_reason),
      'warning_threshold'
    );
    v_terminated := true;
  end if;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'issue_warning', 'profile', p_user::text,
          jsonb_build_object('warning_id', v_id, 'ordinal', v_count, 'category', p_category, 'reason', v_reason));

  return jsonb_build_object(
    'ok', true, 'id', v_id, 'ordinal', v_count, 'active_count', v_count,
    'limit', v_limit, 'terminated', v_terminated,
    'message', case when v_terminated
      then 'سُجِّل الإنذار الثالث، وسُحبت العضويّة ببلوغ الحدّ.'
      else format('سُجِّل الإنذار %s.', case v_count when 1 then 'الأوّل' when 2 then 'الثاني' else v_count::text end) end
  );
end;
$$;

/* ── الإلغاء ─────────────────────────────────────────────────────────────
   الملغى يخرج من العدّ ويبقى في السجلّ مشطوبًا، فيُعاد ترتيب ما بعده. وإن كان هو الذي
   سحب العضويّة فلا تُعاد تلقائيًّا: يُرجَع علمٌ تعرض به الواجهة زرّ «إعادة العضويّة»
   الذي يمرّ بسلطته هو (`restore_membership`) — إعادةٌ صامتةٌ أخطرُ من ضغطةٍ واعية. */

create or replace function public.cancel_warning(p_actor uuid, p_warning uuid, p_reason text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  w member_warnings%rowtype;
begin
  select * into w from member_warnings where id = p_warning;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا الإنذار.');
  end if;
  if w.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'code', 'ALREADY', 'message', 'هذا الإنذار ملغًى أصلًا.');
  end if;
  if not can_issue_warning(p_actor, w.user_id) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ إنذارات هذا العضو.');
  end if;
  if v_reason is null or char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'اكتب سبب الإلغاء (خمسة أحرف فأكثر).');
  end if;

  update member_warnings
  set status = 'cancelled', cancelled_by = p_actor, cancelled_at = now(), cancel_reason = v_reason
  where id = p_warning;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'cancel_warning', 'profile', w.user_id::text,
          jsonb_build_object('warning_id', w.id, 'reason', v_reason));

  return jsonb_build_object(
    'ok', true,
    'message', 'أُلغي الإنذار.',
    'was_termination', w.caused_termination,
    'member_suspended', (select account_status = 'suspended' from profiles where id = w.user_id),
    'active_count', (select count(*) from member_warnings where user_id = w.user_id and status = 'active')
  );
end;
$$;

/* ── الحراسة: قراءةٌ بالحَكَم، ولا كتابةَ إلّا من البابين ─────────────────── */

alter table public.member_warnings enable row level security;

drop policy if exists member_warnings_select on public.member_warnings;
create policy member_warnings_select on public.member_warnings
  for select to authenticated
  using (can_view_warnings_of(auth.uid(), user_id));

revoke insert, update, delete on public.member_warnings from anon, authenticated;
