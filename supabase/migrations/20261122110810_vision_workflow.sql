-- ══ مسارُ عمل فريق الرؤية (محمد ٢٠٢٦-١١-٢٢: «نعم، موافق ونفّذ») ══
-- سقط «خطُّ المتابعة» (التنفيذيّةُ تنفّذ والضمانُ يتابع والمجلسُ يطّلع): فريقُ الرؤية نفسُه ينفّذ ويؤكّد.
--   · قائدُ المسار: يرى مسارَه، ويغيّر حالَ أهدافه حتى «أُنجز» (`reported`).
--   · المشرفُ العامّ وقائدُ الرؤية: يريان المساراتِ كلَّها، ويؤكّدان «تحقّق» أو يُرجعان بسبب، ويصحّحان النصَّ والموعد،
--     ويرفعان «أُنجز» عن مسارٍ قائدُه بلا حساب.
--   · الرئيسان (`manage_vision`): يسمّيان الفريقَ ويريان كلَّ شيء، ولا يغيّران حالًا إلّا بمقعدٍ في الفريق.
--   · **النزاهة**: من رفع «أُنجز» لا يؤكّده — القاعدةُ على الشخص لا على المقعد.
--   · **السجلّ**: كلُّ فعلٍ بفاعله ووقته، ولا يُعدَّل ولا يُمحى.
-- والترحيلُ آمنٌ على الكود المنشور قبل رفعه: «تحقّق» القديم يبقى يعمل، والمفتاحُ المشتقّ الجديد لا يعرفه فلا يضرّه.

-- ١) «أُنجز»: حالٌ بين «قيد العمل» و«تحقّق»، بمن رفعه ودليله، ومن أكّده
alter table public.vision_goals drop constraint vision_goals_status_check;
alter table public.vision_goals add constraint vision_goals_status_check check (status in ('pending', 'active', 'reported', 'done'));
alter table public.vision_goals
  add column reported_by uuid references public.profiles(id) on delete set null,
  add column reported_at timestamptz,
  add column report_note text check (report_note is null or char_length(btrim(report_note)) between 2 and 300),
  add column confirmed_by uuid references public.profiles(id) on delete set null;
alter table public.vision_goals add constraint vision_goals_reported_check check (status <> 'reported' or reported_at is not null);

-- ٢) السجلّ: لا مفتاحَ أجنبيّ على الهدف (يُحفظ عنوانُه في التفاصيل)، فحذفُ هدفٍ لا يمسّ سطرًا
create table public.vision_log (
  id bigint generated always as identity primary key,
  vision_id bigint not null references public.visions(id),
  goal_id bigint,
  actor uuid,
  action text not null check (action in ('status', 'reported', 'withdrawn', 'confirmed', 'returned', 'unconfirmed', 'edited', 'team')),
  from_status text,
  to_status text,
  note text check (note is null or char_length(note) <= 300),
  details jsonb,
  created_at timestamptz not null default now()
);
create index vision_log_recent on public.vision_log (vision_id, created_at desc);
alter table public.vision_log enable row level security;
revoke all on public.vision_log from anon, authenticated;

create or replace function public.vision_log_frozen()
returns trigger language plpgsql set search_path to 'public', 'pg_temp' as $$
begin
  raise exception 'سجلُّ الرؤية لا يُعدَّل ولا يُمحى';
end;
$$;
create trigger vision_log_frozen before update or delete on public.vision_log
  for each row execute function public.vision_log_frozen();

-- ٣) مقعدُ صاحب الجلسة في رؤيةٍ بعينها
create or replace function public.vision_access(p_user uuid, p_vision bigint)
returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select jsonb_build_object(
    'president', coalesce(public.check_user_permission(p_user, 'manage_vision'), false),
    'supervisor', exists (select 1 from public.vision_team where vision_id = p_vision and role = 'supervisor' and profile_id = p_user),
    'leader', exists (select 1 from public.vision_team where vision_id = p_vision and role = 'leader' and profile_id = p_user),
    'tracks', coalesce((select jsonb_agg(track_id order by track_id) from public.vision_team
                        where vision_id = p_vision and role = 'track' and profile_id = p_user), '[]'::jsonb)
  );
$$;

-- ٤) أفعالُ الحال، كلُّها هنا بقيودها وسجلّها: تبدأ، تُرجع إلى «لم يبدأ»، تُرفع «أُنجز»، تُسحب، تُؤكَّد، تُرجَع بسبب، يُلغى تحقّقُها
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
    if not (is_track or confirmer) then return no_perm; end if;
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

  -- ما يحتاجه الإشعار: قادةُ المسار، والمؤكِّدون سوى الفاعل، ومن كان رفعه
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

-- ٥) تصحيحُ نصّ الهدف وموعده: للمشرف العامّ وقائد الرؤية، وفي السجلّ ما تغيّر (قبلُ وبعدُ)
create or replace function public.vision_goal_edit(p_goal bigint, p_actor uuid, p_fields jsonb)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  g record;
  v_slug text;
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
  select slug into v_slug from public.visions where id = g.vision_id;

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

-- ٦) حفظُ الفريق: للرئيسين وحدهما، وفي السجلّ قبلُه وبعدُه، ويُرجع من سُمّي الآن (لإشعار التكليف)
drop function public.save_vision_team(bigint, uuid, jsonb);
create function public.save_vision_team(p_vision_id bigint, p_actor uuid, p_seats jsonb)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_new jsonb;
begin
  if not coalesce(public.check_user_permission(p_actor, 'manage_vision'), false) then
    return jsonb_build_object('ok', false, 'message', 'تسمية فريق الرؤية للرئيسين.');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('role', role, 'track_id', track_id, 'profile_id', profile_id, 'name', name) order by role, track_id), '[]'::jsonb)
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

  select coalesce(jsonb_agg(jsonb_build_object('role', role, 'track_id', track_id, 'profile_id', profile_id, 'name', name) order by role, track_id), '[]'::jsonb)
    into v_after from public.vision_team where vision_id = p_vision_id;

  -- من صار في مقعدٍ لم يكن فيه (ومنه من رُبط مقعدُه المكتوبُ باسمه بحسابه)
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

revoke all on function public.vision_access(uuid, bigint) from public, anon, authenticated;
revoke all on function public.vision_goal_act(bigint, uuid, text, text) from public, anon, authenticated;
revoke all on function public.vision_goal_edit(bigint, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.save_vision_team(bigint, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.vision_log_frozen() from public, anon, authenticated;
grant execute on function public.vision_access(uuid, bigint) to service_role;
grant execute on function public.vision_goal_act(bigint, uuid, text, text) to service_role;
grant execute on function public.vision_goal_edit(bigint, uuid, jsonb) to service_role;
grant execute on function public.save_vision_team(bigint, uuid, jsonb) to service_role;

-- ٧) بابُ الغرفة: مفتاحٌ مشتقٌّ (`work_vision`) لمن في فريق رؤيةٍ سارية، وللرئيسين — لا يُمنح بدورٍ ولا يدويًّا
insert into public.permissions (permission_key, permission_name_ar, description, category)
values ('work_vision', 'فريق الرؤية', 'مشتقّة: لمن له مقعدٌ في فريق الرؤية السارية، وللرئيسين (manage_vision) — غرفةُ «متابعة الرؤية». لا تُمنح بدور.', 'portal')
on conflict (permission_key) do nothing;

create or replace function public.get_user_permissions(p_user_id uuid)
 returns table(permission_key text, permission_name_ar text, category text)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
    return query
    -- صلاحيات الدور
    select distinct
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    from user_roles ur
    join role_permissions rp on rp.role_name = ur.role_name
    join permissions perm    on perm.id = rp.permission_id
    where ur.user_id  = p_user_id
      and ur.is_active = true

    union

    -- الصلاحيات الفردية المضافة
    select distinct
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    from user_specific_permissions usp
    join permissions perm on perm.id = usp.permission_id
    where usp.user_id   = p_user_id
      and usp.is_granted = true
      and (usp.expires_at is null or usp.expires_at > now())

    union

    -- مفاتيحُ المكانة المشتقّة (بوّابة أدِيب): بابُ كلّ صاحب حساب، وغرفةُ المتطوّع، وغرفةُ فريق الرؤية
    select perm.permission_key, perm.permission_name_ar, perm.category
    from permissions perm
    where (perm.permission_key = 'use_portal'
           and exists (select 1 from auth.users u where u.id = p_user_id))
       or (perm.permission_key = 'view_own_volunteering'
           and public.adeeb_standing(p_user_id) = 'volunteer')
       or (perm.permission_key = 'work_vision'
           and (exists (select 1 from public.vision_team vt join public.visions v on v.id = vt.vision_id
                        where vt.profile_id = p_user_id and v.status = 'active')
                or public.check_user_permission(p_user_id, 'manage_vision')))

    except

    -- حذف الصلاحيات المحظورة صراحةً
    select distinct
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    from user_specific_permissions usp
    join permissions perm on perm.id = usp.permission_id
    where usp.user_id   = p_user_id
      and usp.is_granted = false
      and (usp.expires_at is null or usp.expires_at > now());
end;
$function$;

-- ٨) سقط خطُّ المتابعة: الضمانُ والجودة لا يملك الرؤيةَ بعد اليوم (المقعدُ شاغرٌ اليوم)
delete from public.role_permissions
 where role_name = 'qa_committee_leader'
   and permission_id = (select id from public.permissions where permission_key = 'manage_vision');

-- ٩) الصفحةُ العلنيّة لا ترى «أُنجز»: تراه «قيد العمل» حتى يُؤكَّد (لا يُعلَن ما لم يُشهد عليه)
create or replace function public.get_public_vision(p_slug text default null::text)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  with v as (
    select * from public.visions
    where status in ('active', 'closed') and (p_slug is null or slug = p_slug)
    order by (status = 'active') desc, starts_on desc
    limit 1
  )
  select (
    select jsonb_build_object(
      'slug', v.slug,
      'name', v.name,
      'starts_on', v.starts_on,
      'horizon_label', v.horizon_label,
      'horizon_on', v.horizon_on,
      'status', v.status,
      'tracks', coalesce((
        select jsonb_agg(jsonb_build_object(
          'position', t.position,
          'name', t.name,
          'summary', t.summary,
          'icon', t.icon,
          'goals', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', g.id, 'cluster', g.cluster, 'title', g.title, 'detail', g.detail,
              'target', g.target, 'owner', g.owner, 'due_on', g.due_on,
              'status', case when g.status = 'reported' then 'active' else g.status end, 'done_at', g.done_at
            ) order by g.position)
            from public.vision_goals g where g.track_id = t.id
          ), '[]'::jsonb)
        ) order by t.position)
        from public.vision_tracks t where t.vision_id = v.id
      ), '[]'::jsonb),
      'team', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id,
          'role', m.role,
          'track', t.position,
          'name', coalesce(p.full_name, m.name),
          'gender', coalesce(p.gender, m.gender),
          'avatar', case when p.account_status = 'active' and p.joined_date is not null then p.avatar_url end,
          'slug', case when p.account_status = 'active' and p.joined_date is not null then p.public_slug end
        ) order by m.id)
        from public.vision_team m
        left join public.vision_tracks t on t.id = m.track_id
        left join public.profiles p on p.id = m.profile_id
        where m.vision_id = v.id
      ), '[]'::jsonb),
      'archive', coalesce((
        select jsonb_agg(jsonb_build_object(
          'slug', o.slug, 'name', o.name, 'starts_on', o.starts_on,
          'horizon_label', o.horizon_label, 'status', o.status,
          'total', (select count(*) from public.vision_goals g join public.vision_tracks t on t.id = g.track_id where t.vision_id = o.id),
          'done', (select count(*) from public.vision_goals g join public.vision_tracks t on t.id = g.track_id where t.vision_id = o.id and g.status = 'done')
        ) order by o.starts_on desc)
        from public.visions o where o.status in ('active', 'closed') and o.id <> v.id
      ), '[]'::jsonb)
    )
    from v
  );
$function$;
