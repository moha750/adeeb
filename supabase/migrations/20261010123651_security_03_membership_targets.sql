-- ══════════════════════════════════════════════════════════════════════════════
-- أمنٌ ٠٣ (٢٠٢٦-١٠-١٠): الإنذارُ والإنهاءُ لا يقعان إلّا على عضو، وأجلُ تكليف القائد بيد الرئيس
--
--   أ) `issue_warning` لا تشترط إلّا حسابًا نشطًا، و`can_end_membership` لا تسأل هل المقصودُ
--      عضو. فكان في كشف «من يجوز إنذارهم» ٢٢٩ صديقًا ومتطوّعًا، ولو بلغ أحدُهم ثلاثةَ إنذاراتٍ
--      لسُجِّل عليه «إنهاءُ عضويّة» لا عضويّةَ له.
--   ب) `extend_acting` تجيز تقديمَ آخر يومٍ في التكليف على مقعد قائد إدارةٍ لمن يملك التعيين،
--      فيُنهى التكليفُ في جولة الكنّاس التالية دون رئيس أدِيب. والمادة ٣٥: «لا يُنهى قبل أجله،
--      ولا يُقدَّم أجله، إلّا بيد رئيس أدِيب».
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.issue_warning(p_actor uuid, p_user uuid, p_category text, p_reason text, p_committee integer DEFAULT NULL::integer, p_occurred date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status text;
  v_joined date;
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_role text;
  v_committee integer := p_committee;
  v_id uuid;
  v_count integer;
  v_limit integer := warning_limit();
  v_terminated boolean := false;
begin
  select account_status, joined_date into v_status, v_joined from profiles where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;
  -- عضوٌ عضويّته سارية: حسابٌ نشط وتاريخُ انضمام. فلا يُنذَر صديقٌ ولا متطوّع (ثغرة ٢٠٢٦-١٠-١٠).
  if v_status <> 'active' or v_joined is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_ACTIVE',
      'message', 'لا يُنذَر إلّا عضوٌ عضويّته سارية.');
  end if;

  if not can_issue_warning(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ إنذار هذا العضو.');
  end if;

  -- أعضاء المجلس الإداريّ لا يُنذَرون (قرار محمد 20261010): رئيس أدِيب والرئيس التنفيذيّ وقائدا
  -- الموارد والضمان. فلا يصير الإنذار بابًا جانبيًّا إلى عزل من لا يعزله إلّا رئيس أدِيب.
  if is_warning_exempt(p_user) then
    return jsonb_build_object('ok', false, 'code', 'EXEMPT',
      'message', 'أعضاء المجلس الإداري لا يُنذَرون.');
  end if;

  if p_category is null or p_category not in
     ('absence','lateness','task_neglect','unresponsive','conduct','policy','other') then
    return jsonb_build_object('ok', false, 'code', 'BAD_CATEGORY', 'message', 'اختر تصنيف المخالفة.');
  end if;
  if v_reason is null or char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED',
      'message', 'اكتب سبب الإنذار (خمسة أحرف فأكثر).');
  end if;

  -- الواقعة أثرٌ ماضٍ: لا تقع غدًا، ولا تقع قبل أن يصير المُنذَرُ عضوًا
  if p_occurred is not null then
    if p_occurred > v_today then
      return jsonb_build_object('ok', false, 'code', 'FUTURE_DATE',
        'message', 'تاريخ الواقعة لا يكون في المستقبل.');
    end if;
    if v_joined is not null and p_occurred < v_joined then
      return jsonb_build_object('ok', false, 'code', 'BEFORE_JOIN',
        'message', format('تاريخ الواقعة يسبق انضمام العضو (%s).', to_char(v_joined, 'YYYY-MM-DD')));
    end if;
  end if;

  -- لقطة الموقع: اللجنة المذكورة إن صحّت، وإلّا لجنةُ دوره الحيّ إن كانت واحدة
  select ur.role_name, coalesce(v_committee, ur.committee_id)
  into v_role, v_committee
  from user_roles ur
  where ur.user_id = p_user and ur.is_active
    and (v_committee is null or ur.committee_id = v_committee)
  order by ur.is_acting, (ur.committee_id is not null) desc, ur.assigned_at
  limit 1;

  insert into member_warnings (user_id, issued_by, committee_id, role_at_issue, category, reason, occurred_on)
  values (p_user, p_actor, v_committee, v_role, p_category, v_reason, p_occurred)
  returning id into v_id;

  select count(*) into v_count from member_warnings
  where user_id = p_user and status = 'active';

  if v_count >= v_limit then
    update member_warnings set caused_termination = true where id = v_id;
    perform set_config('app.termination_kind', case
      when p_category in ('absence', 'lateness', 'task_neglect', 'unresponsive') then 'idle'
      when p_category in ('conduct', 'policy') then 'breach'
      else 'other' end, true);
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
$function$;

CREATE OR REPLACE FUNCTION public.members_i_may_warn(p_actor uuid)
 RETURNS TABLE(user_id uuid, name text, phone text, avatar text, gender text, committee_id integer, committee_name text, role_ar text, active_count integer, joined_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id, p.full_name, p.phone, p.avatar_url, p.gender,
         ur.committee_id, c.committee_name_ar, ro.role_name_ar,
         (select count(*)::integer from member_warnings w where w.user_id = p.id and w.status = 'active'),
         p.joined_date
  from profiles p
  left join lateral (
    select u.committee_id, u.role_name from user_roles u
    where u.user_id = p.id and u.is_active
    order by u.is_acting, (u.committee_id is not null) desc, u.assigned_at limit 1
  ) ur on true
  left join committees c on c.id = ur.committee_id
  left join roles ro     on ro.role_name = ur.role_name
  where p.account_status = 'active' and p.joined_date is not null   -- الأعضاءُ وحدهم
    and can_issue_warning(p_actor, p.id)
    and not is_warning_exempt(p.id);   -- أعضاء المجلس الإداريّ لا يُنذَرون (20261010)
$function$;

CREATE OR REPLACE FUNCTION public.terminate_membership(p_actor uuid, p_user uuid, p_reason text, p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status text;
  v_member boolean;
begin
  select account_status, joined_date is not null into v_status, v_member from profiles where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;
  if v_status = 'suspended' then
    return jsonb_build_object('ok', false, 'code', 'ALREADY', 'message', 'عضويّته منتهية أصلًا.');
  end if;
  -- الإنهاءُ لا يقع إلّا على عضو: من لا تاريخَ انضمامٍ له صديقٌ أو متطوّع لا عضويّةَ له تُنهى.
  if not v_member then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER', 'message', 'ليس عضوًا، فلا عضويّةَ تُنهى.');
  end if;

  if p_actor = p_user then
    return jsonb_build_object('ok', false, 'code', 'SELF', 'message', 'لا تُنهي عضويّتك بنفسك.');
  end if;
  if not can_end_membership(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ عضويّة هذا العضو، فلا تُنهي إلّا عضويّة من تملك نزع مناصبه.');
  end if;

  if p_kind is null or p_kind not in ('idle', 'silent', 'asked', 'breach', 'other') then
    return jsonb_build_object('ok', false, 'code', 'KIND_REQUIRED', 'message', 'اختر فئة السبب.');
  end if;
  if v_reason is null or char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'اذكر سبب إنهاء العضوية (خمسة أحرف فأكثر).');
  end if;

  perform set_config('app.termination_kind', p_kind, true);
  perform _apply_termination(p_actor, p_user, v_reason, 'authority');

  return jsonb_build_object('ok', true, 'message', 'أُنهيت العضوية.');
end;
$function$;

CREATE OR REPLACE FUNCTION public.terminate_membership(p_actor uuid, p_user uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status text;
  v_member boolean;
begin
  select account_status, joined_date is not null into v_status, v_member from profiles where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;
  if v_status = 'suspended' then
    return jsonb_build_object('ok', false, 'code', 'ALREADY', 'message', 'عضويّته منتهية أصلًا.');
  end if;
  -- الإنهاءُ لا يقع إلّا على عضو: من لا تاريخَ انضمامٍ له صديقٌ أو متطوّع لا عضويّةَ له تُنهى.
  if not v_member then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER', 'message', 'ليس عضوًا، فلا عضويّةَ تُنهى.');
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
$function$;

CREATE OR REPLACE FUNCTION public.move_member_to_volunteers(p_actor uuid, p_user uuid, p_reason text, p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status text;
  v_member boolean;
begin
  select account_status, joined_date is not null into v_status, v_member from profiles where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;
  if v_status = 'suspended' then
    return jsonb_build_object('ok', false, 'code', 'ALREADY', 'message', 'عضويّته منتهية أصلًا.');
  end if;
  -- الإنهاءُ لا يقع إلّا على عضو: من لا تاريخَ انضمامٍ له صديقٌ أو متطوّع لا عضويّةَ له تُنهى.
  if not v_member then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER', 'message', 'ليس عضوًا، فلا عضويّةَ تُنهى.');
  end if;
  if p_actor = p_user then
    return jsonb_build_object('ok', false, 'code', 'SELF', 'message', 'لا تُنهي عضويّتك بنفسك.');
  end if;
  if not can_end_membership(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ عضويّة هذا العضو، فلا تُنهي إلّا عضويّة من تملك نزع مناصبه.');
  end if;
  if p_kind is null or p_kind not in ('idle', 'asked', 'other') then
    return jsonb_build_object('ok', false, 'code', 'KIND_REQUIRED', 'message', 'اختر فئة السبب.');
  end if;
  if v_reason is null or char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'اذكر سبب إنهاء العضوية (خمسة أحرف فأكثر).');
  end if;

  perform set_config('app.termination_kind', p_kind, true);
  perform _apply_termination(p_actor, p_user, v_reason, 'to_volunteer');

  -- من كان متطوّعًا قبل عضويّته يعود صفُّه نفسُه نشطًا، ويبقى خبرُ انتهائه السابق كما هو
  insert into volunteers (user_id, status, applied_at)
  values (p_user, 'active', now())
  on conflict (user_id) do update
    set status = 'active',
        returned_at = now();

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'member_to_volunteer', 'profile', p_user::text, jsonb_build_object('reason', v_reason, 'kind', p_kind));

  return jsonb_build_object('ok', true, 'message', 'انتهت عضويّتُه، وصار متطوّعًا.');
end;
$function$;

CREATE OR REPLACE FUNCTION public.move_member_to_volunteers(p_actor uuid, p_user uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status text;
  v_member boolean;
begin
  select account_status, joined_date is not null into v_status, v_member from profiles where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;
  if v_status = 'suspended' then
    return jsonb_build_object('ok', false, 'code', 'ALREADY', 'message', 'عضويّته منتهية أصلًا.');
  end if;
  -- الإنهاءُ لا يقع إلّا على عضو: من لا تاريخَ انضمامٍ له صديقٌ أو متطوّع لا عضويّةَ له تُنهى.
  if not v_member then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER', 'message', 'ليس عضوًا، فلا عضويّةَ تُنهى.');
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

  perform _apply_termination(p_actor, p_user, v_reason, 'to_volunteer');

  -- من كان متطوّعًا قبل عضويّته يعود صفُّه نفسُه نشطًا، ويبقى خبرُ انتهائه السابق كما هو
  insert into volunteers (user_id, status, applied_at)
  values (p_user, 'active', now())
  on conflict (user_id) do update
    set status = 'active',
        returned_at = now();

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'member_to_volunteer', 'profile', p_user::text, jsonb_build_object('reason', v_reason));

  return jsonb_build_object('ok', true, 'message', 'انتهت عضويّتُه، وصار متطوّعًا.');
end;
$function$;

CREATE OR REPLACE FUNCTION public._apply_termination(p_actor uuid, p_user uuid, p_reason text, p_source text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  -- الفئةُ من باب السلطة إن حملها، وإلّا فمن مصدر الإنهاء: من خرج بإرادته فبطلبه
  v_kind text := coalesce(
    nullif(current_setting('app.termination_kind', true), ''),
    case when p_source in ('exit_request', 'self_exit', 'account_deletion') then 'asked' else 'other' end);
begin
  -- حارسٌ أخير: الإنهاءُ لا يقع إلّا على من له عضويّة (تاريخُ انضمام)، أيًّا كان بابُه.
  if not exists (select 1 from profiles where id = p_user and joined_date is not null) then
    raise exception 'لا تُنهى إلّا عضويّةٌ قائمة.' using errcode = '42501';
  end if;
  perform set_config('app.membership_gate', 'open', true);
  update profiles
  set account_status = 'suspended', termination_reason = p_reason, termination_kind = v_kind, updated_at = now()
  where id = p_user;
  perform set_config('app.membership_gate', '', true);
  perform set_config('app.termination_kind', '', true);

  -- والمقعدُ يخلو مع صاحبه (2026-08-20): من خرج من النادي لا يبقى اسمُه في الهيكل
  -- والتكليف يُنهى من بابه (2026-10-10): فينتهي التابعون له، ويُرفع التجميد عن أصيله ولا يعود.
  perform _end_acting(ur.id, p_actor, 'membership_ended', p_reason)
  from user_roles ur
  where ur.user_id = p_user and ur.is_acting and ur.is_active;
  update user_roles set frozen_by = null where user_id = p_user and frozen_by is not null;

  update user_roles set is_active = false
  where user_id = p_user and is_active;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'terminate_membership', 'profile', p_user::text,
          jsonb_build_object('reason', p_reason, 'source', p_source, 'kind', v_kind));
end;
$function$;

CREATE OR REPLACE FUNCTION public.extend_acting(p_actor uuid, p_row integer, p_until date, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_row   user_roles%rowtype;
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
begin
  select * into v_row from user_roles where id = p_row for update;
  if not found or not v_row.is_acting or not v_row.is_active then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا تكليفَ قائمًا بهذا الرقم.');
  end if;
  if v_row.acting_parent_id is not null then
    return jsonb_build_object('ok', false, 'code', 'CHAINED',
      'message', 'هذا التكليف ينتهي بعودة صاحب المقعد، فلا تاريخ له.');
  end if;
  if p_actor = v_row.user_id then
    return jsonb_build_object('ok', false, 'code', 'SELF', 'message', 'لا يُعدِّل أحدٌ تكليفَ نفسه.');
  end if;
  if not can_assign_role(p_actor, v_row.role_name, v_row.committee_id)
     or not can_take_position_from(p_actor, v_row.user_id) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ هذا التكليف.');
  end if;
  -- تقديمُ أجلِ التكليف على مقعد قائد إدارةٍ كإنهائه قبل أجله: بيد رئيس أدِيب وحده (المادة ٣٥).
  if p_until is not null and v_row.acting_until is not null and p_until < v_row.acting_until
     and exists (select 1 from roles r where r.role_name = v_row.role_name and r.removal_needs_club_president)
     and not is_club_president(p_actor) then
    return jsonb_build_object('ok', false, 'code', 'NEEDS_CLUB_PRESIDENT',
      'message', 'لا يُقدَّم أجلُ تكليف قائد إدارةٍ إلّا بيد رئيس أدِيب.');
  end if;
  if p_until is null or p_until < v_today then
    return jsonb_build_object('ok', false, 'code', 'PAST_UNTIL', 'message', 'آخر يومٍ في التكليف لا يسبق اليوم.');
  end if;
  if p_until = v_row.acting_until then
    return jsonb_build_object('ok', false, 'code', 'SAME', 'message', 'هذا آخر يومٍ في التكليف أصلًا.');
  end if;

  update user_roles set acting_until = p_until where id = p_row;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'extend_acting', 'user_role', p_row::text,
          jsonb_build_object('user_id', v_row.user_id, 'from', v_row.acting_until, 'to', p_until,
                             'reason', nullif(btrim(coalesce(p_reason, '')), '')));

  return jsonb_build_object('ok', true,
    'message', 'صار آخر يومٍ في التكليف ' || to_char(p_until, 'YYYY-MM-DD') || '.');
end;
$function$;

