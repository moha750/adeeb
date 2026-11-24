-- ══ إصلاحاتُ مسار عمل فريق الرؤية من المراجعة المستقلّة (٢٠٢٦-١١-٢٢) ══
--   · «سحب أُنجز» لمن رفعه أو لقائد مساره وحدهما: كان المؤكِّدُ يسحب رفعَ غيره بلا سببٍ ولا إشعار، وذلك «إرجاعٌ» متخفٍّ.
--   · التصحيحُ في رؤيةٍ سارية وحدها، كسائر الأفعال.
--   · المشرفُ العامّ وقائدُ الرؤية شخصان: لو كانا واحدًا لما وُجد من يؤكّد ما يرفعه.
--   · لقطةُ الفريق في السجلّ بجنس صاحب الاسم المكتوب، فيُذكر مقعدُه بجنسه.

-- ١) السحبُ
create or replace function public.vision_goal_act(p_goal bigint, p_actor uuid, p_action text, p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  g record;
  v_slug text;
  v_status text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  is_track boolean;
  confirmer boolean;
  v_to text;
  v_log text;
  no_perm constant jsonb := jsonb_build_object('ok', false, 'message', 'هذا الفعل ليس لمقعدك في فريق الرؤية.');
  bad_state constant jsonb := jsonb_build_object('ok', false, 'message', 'تغيّر حال الهدف قبل فعلك، فحدّث الصفحة.');
begin
  select g0.id, g0.title, g0.status, g0.track_id, g0.reported_by, t.vision_id, t.name as track_name, t.position as track_pos
    into g
    from public.vision_goals g0 join public.vision_tracks t on t.id = g0.track_id
   where g0.id = p_goal
   for update of g0;
  if not found then return jsonb_build_object('ok', false, 'message', 'الهدف غير موجود.'); end if;

  select slug, status into v_slug, v_status from public.visions where id = g.vision_id;
  if v_status <> 'active' then return jsonb_build_object('ok', false, 'message', 'الرؤية ليست سارية.'); end if;
  if v_note is not null and char_length(v_note) not between 2 and 300 then
    return jsonb_build_object('ok', false, 'message', 'الملاحظة بين حرفين و300 حرف.');
  end if;

  confirmer := exists (select 1 from public.vision_team where vision_id = g.vision_id and role in ('supervisor', 'leader') and profile_id = p_actor);
  is_track := exists (select 1 from public.vision_team where vision_id = g.vision_id and role = 'track' and track_id = g.track_id and profile_id = p_actor);

  if p_action = 'start' then
    if not (is_track or confirmer) then return no_perm; end if;
    if g.status <> 'pending' then return bad_state; end if;
    v_to := 'active'; v_log := 'status';
    update public.vision_goals set status = 'active', updated_by = p_actor, updated_at = now() where id = g.id;

  elsif p_action = 'unstart' then
    if not (is_track or confirmer) then return no_perm; end if;
    if g.status <> 'active' then return bad_state; end if;
    v_to := 'pending'; v_log := 'status';
    update public.vision_goals set status = 'pending', updated_by = p_actor, updated_at = now() where id = g.id;

  elsif p_action = 'report' then
    if not (is_track or confirmer) then return no_perm; end if;
    if g.status not in ('pending', 'active') then return bad_state; end if;
    v_to := 'reported'; v_log := 'reported';
    update public.vision_goals
       set status = 'reported', reported_by = p_actor, reported_at = now(), report_note = v_note, updated_by = p_actor, updated_at = now()
     where id = g.id;

  elsif p_action = 'withdraw' then
    -- يسحب الرفعَ من رفعه أو قائدُ مساره؛ وللمؤكِّد «الإرجاعُ بسبب» لا السحب
    if not (is_track or g.reported_by = p_actor) then
      return jsonb_build_object('ok', false, 'message', 'يسحب «أُنجز» من رفعه أو قائد مساره، وللمؤكِّد «الإرجاع بسبب».');
    end if;
    if g.status <> 'reported' then return bad_state; end if;
    v_to := 'active'; v_log := 'withdrawn';
    update public.vision_goals
       set status = 'active', reported_by = null, reported_at = null, report_note = null, updated_by = p_actor, updated_at = now()
     where id = g.id;

  elsif p_action = 'confirm' then
    if not confirmer then return jsonb_build_object('ok', false, 'message', 'التأكيد للمشرف العام وقائد الرؤية.'); end if;
    if g.status <> 'reported' then return bad_state; end if;
    if g.reported_by = p_actor then
      return jsonb_build_object('ok', false, 'message', 'رفعتَ هذا الهدف بنفسك، فيؤكّده غيرك من قادة الرؤية.');
    end if;
    v_to := 'done'; v_log := 'confirmed';
    update public.vision_goals
       set status = 'done', done_at = now(), confirmed_by = p_actor, updated_by = p_actor, updated_at = now()
     where id = g.id;

  elsif p_action = 'return' then
    if not confirmer then return jsonb_build_object('ok', false, 'message', 'الإرجاع للمشرف العام وقائد الرؤية.'); end if;
    if g.status <> 'reported' then return bad_state; end if;
    if g.reported_by = p_actor then
      return jsonb_build_object('ok', false, 'message', 'رفعتَ هذا الهدف بنفسك، فاسحبه بدل أن ترجعه.');
    end if;
    if v_note is null then return jsonb_build_object('ok', false, 'message', 'اكتب سبب الإرجاع.'); end if;
    v_to := 'active'; v_log := 'returned';
    update public.vision_goals
       set status = 'active', reported_by = null, reported_at = null, report_note = null, updated_by = p_actor, updated_at = now()
     where id = g.id;

  elsif p_action = 'unconfirm' then
    if not confirmer then return jsonb_build_object('ok', false, 'message', 'إلغاء التحقّق للمشرف العام وقائد الرؤية.'); end if;
    if g.status <> 'done' then return bad_state; end if;
    v_to := 'active'; v_log := 'unconfirmed';
    update public.vision_goals
       set status = 'active', done_at = null, confirmed_by = null, reported_by = null, reported_at = null, report_note = null,
           updated_by = p_actor, updated_at = now()
     where id = g.id;

  else
    return jsonb_build_object('ok', false, 'message', 'فعلٌ غير معروف.');
  end if;

  insert into public.vision_log (vision_id, goal_id, actor, action, from_status, to_status, note, details)
  values (g.vision_id, g.id, p_actor, v_log, g.status, v_to, v_note, jsonb_build_object('title', g.title, 'track', g.track_pos));

  return jsonb_build_object(
    'ok', true, 'slug', v_slug, 'from', g.status, 'to', v_to,
    'goal', jsonb_build_object('id', g.id, 'title', g.title, 'track', g.track_pos, 'track_name', g.track_name),
    'reported_by', g.reported_by,
    'track_leaders', coalesce((select jsonb_agg(profile_id) from public.vision_team
                               where vision_id = g.vision_id and role = 'track' and track_id = g.track_id and profile_id is not null), '[]'::jsonb),
    'confirmers', coalesce((select jsonb_agg(distinct profile_id) from public.vision_team
                            where vision_id = g.vision_id and role in ('supervisor', 'leader') and profile_id is not null and profile_id <> p_actor), '[]'::jsonb)
  );
end;
$$;

-- ٢) التصحيحُ في رؤيةٍ سارية وحدها
create or replace function public.vision_goal_edit(p_goal bigint, p_actor uuid, p_fields jsonb)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  g record;
  v_slug text;
  v_status text;
  v_changes jsonb := '{}'::jsonb;
  k text;
  v_old text;
  v_new text;
begin
  select g0.*, t.vision_id, t.position as track_pos into g
    from public.vision_goals g0 join public.vision_tracks t on t.id = g0.track_id
   where g0.id = p_goal
   for update of g0;
  if not found then return jsonb_build_object('ok', false, 'message', 'الهدف غير موجود.'); end if;
  if not exists (select 1 from public.vision_team where vision_id = g.vision_id and role in ('supervisor', 'leader') and profile_id = p_actor) then
    return jsonb_build_object('ok', false, 'message', 'تعديل الأهداف للمشرف العام وقائد الرؤية.');
  end if;
  select slug, status into v_slug, v_status from public.visions where id = g.vision_id;
  if v_status <> 'active' then return jsonb_build_object('ok', false, 'message', 'الرؤية ليست سارية.'); end if;

  foreach k in array array['title', 'detail', 'target', 'owner', 'baseline', 'due_on'] loop
    v_old := case k when 'title' then g.title when 'detail' then g.detail when 'target' then g.target when 'owner' then g.owner
                    when 'baseline' then g.baseline else g.due_on::text end;
    v_new := nullif(btrim(coalesce(p_fields->>k, '')), '');
    if v_old is distinct from v_new then v_changes := v_changes || jsonb_build_object(k, jsonb_build_array(v_old, v_new)); end if;
  end loop;
  if v_changes = '{}'::jsonb then return jsonb_build_object('ok', true, 'slug', v_slug, 'changed', false); end if;

  update public.vision_goals set
    title = coalesce(nullif(btrim(p_fields->>'title'), ''), title),
    detail = nullif(btrim(coalesce(p_fields->>'detail', '')), ''),
    target = coalesce(nullif(btrim(p_fields->>'target'), ''), target),
    owner = coalesce(nullif(btrim(p_fields->>'owner'), ''), owner),
    baseline = nullif(btrim(coalesce(p_fields->>'baseline', '')), ''),
    due_on = nullif(p_fields->>'due_on', '')::date,
    updated_by = p_actor, updated_at = now()
  where id = g.id;

  insert into public.vision_log (vision_id, goal_id, actor, action, details)
  values (g.vision_id, g.id, p_actor, 'edited', jsonb_build_object('title', g.title, 'track', g.track_pos, 'changes', v_changes));
  return jsonb_build_object('ok', true, 'slug', v_slug, 'changed', true);
end;
$$;

-- ٣) الفريق: المشرفُ والقائدُ شخصان، ولقطةُ السجلّ بالجنس
create or replace function public.save_vision_team(p_vision_id bigint, p_actor uuid, p_seats jsonb)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_new jsonb;
  v_sup text;
  v_lead text;
begin
  if not coalesce(public.check_user_permission(p_actor, 'manage_vision'), false) then
    return jsonb_build_object('ok', false, 'message', 'تسمية فريق الرؤية للرئيسين.');
  end if;

  select coalesce(s->>'profile_id', btrim(s->>'name')) into v_sup from jsonb_array_elements(coalesce(p_seats, '[]'::jsonb)) s where s->>'role' = 'supervisor' limit 1;
  select coalesce(s->>'profile_id', btrim(s->>'name')) into v_lead from jsonb_array_elements(coalesce(p_seats, '[]'::jsonb)) s where s->>'role' = 'leader' limit 1;
  if nullif(v_sup, '') is not null and v_sup = v_lead then
    return jsonb_build_object('ok', false, 'message', 'المشرف العام وقائد الرؤية شخصان: من رفع «أُنجز» يؤكّده الآخر.');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('role', role, 'track_id', track_id, 'profile_id', profile_id, 'name', name, 'gender', gender) order by role, track_id), '[]'::jsonb)
    into v_before from public.vision_team where vision_id = p_vision_id;

  delete from public.vision_team where vision_id = p_vision_id;
  insert into public.vision_team (vision_id, role, track_id, profile_id, name, gender, updated_by)
  select p_vision_id,
         s->>'role',
         nullif(s->>'track_id', '')::bigint,
         nullif(s->>'profile_id', '')::uuid,
         nullif(btrim(s->>'name'), ''),
         nullif(s->>'gender', ''),
         p_actor
  from jsonb_array_elements(coalesce(p_seats, '[]'::jsonb)) s;

  select coalesce(jsonb_agg(jsonb_build_object('role', role, 'track_id', track_id, 'profile_id', profile_id, 'name', name, 'gender', gender) order by role, track_id), '[]'::jsonb)
    into v_after from public.vision_team where vision_id = p_vision_id;

  select coalesce(jsonb_agg(jsonb_build_object('profile_id', m.profile_id, 'role', m.role, 'track', t.position, 'track_name', t.name)), '[]'::jsonb)
    into v_new
    from public.vision_team m left join public.vision_tracks t on t.id = m.track_id
   where m.vision_id = p_vision_id and m.profile_id is not null
     and not exists (select 1 from jsonb_array_elements(v_before) b
                     where b->>'role' = m.role and coalesce(b->>'track_id', '') = coalesce(m.track_id::text, '')
                       and b->>'profile_id' = m.profile_id::text);

  if v_before is distinct from v_after then
    insert into public.vision_log (vision_id, actor, action, details)
    values (p_vision_id, p_actor, 'team', jsonb_build_object('before', v_before, 'after', v_after));
  end if;
  return jsonb_build_object('ok', true, 'assigned', v_new);
end;
$$;

revoke all on function public.vision_goal_act(bigint, uuid, text, text) from public, anon, authenticated;
revoke all on function public.vision_goal_edit(bigint, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.save_vision_team(bigint, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.vision_goal_act(bigint, uuid, text, text) to service_role;
grant execute on function public.vision_goal_edit(bigint, uuid, jsonb) to service_role;
grant execute on function public.save_vision_team(bigint, uuid, jsonb) to service_role;
