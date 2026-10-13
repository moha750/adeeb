-- أعضاء المجلس الإداريّ لا يُنذَرون.
--
-- قرار محمد (2026-10-10): لا تصدر إنذاراتٌ لرئيس أدِيب ولا للرئيس التنفيذيّ ولا لقائدَي الموارد
-- والضمان، «لأنهم من المجلس الإداري». فالمعيار عضويّة المجلس كما تقولها القاعدة
-- (`roles.council_type = 'administrative'` و`membership_kind = 'member'`)، لا قائمةٌ محفورة:
-- من أُضيف إلى المجلس غدًا استُثني معه. ولا يمسّ الإلغاءَ ولا إبلاغَ إنذارٍ قائم
-- (`can_issue_warning` باقٍ كما هو)، فيبقى ما صدر قبلُ قابلًا للإلغاء.

create or replace function public.is_warning_exempt(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from user_roles ur join roles r on r.role_name = ur.role_name
    where ur.user_id = p_user and ur.is_active
      and r.council_type = 'administrative' and r.membership_kind = 'member'
  );
$$;
revoke execute on function public.is_warning_exempt(uuid) from public, anon;

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
  if v_status <> 'active' then
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
  where p.account_status = 'active' and can_issue_warning(p_actor, p.id)
    and not is_warning_exempt(p.id);   -- أعضاء المجلس الإداريّ لا يُنذَرون (20261010)
$function$;
