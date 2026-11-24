-- مسوّدةُ الرؤية لصاحبها (محمد ٢٠٢٦-١١-٢٤: «من ينشئ المسودة تظهر له هو لوحده»):
-- الرئيسان ينشئان رؤيةً متى شاءا ولو قامت إدارةُ الضمان والجودة، وكلُّ مسوّدةٍ لجهتها: مسوّدةُ الإدارة لأعضائها كلِّهم،
-- ومسوّدةُ الرئيس له وحده بمقعده. وما أُرسل يراه الرئيسان والإدارةُ قراءةً، ولا يكتب فيه أحدٌ حتى يُسحب أو يُعاد.
alter table public.visions add column if not exists author_side text
  check (author_side in ('qa', 'club_president', 'executive_council_president'));
comment on column public.visions.author_side is
  'جهةُ المسوّدة: qa (إدارة الضمان والجودة كلُّها) أو مقعدُ الرئيس الذي أنشأها. تُكتب لجهتها وحدها، ولا يراها غيرُها قبل الإرسال.';
update public.visions set author_side = coalesce(public.vision_president_seat(created_by), 'qa') where author_side is null;

-- يُنشئ الرؤى: من يحمل `draft_vision` (إدارةُ الضمان والجودة والرئيسان)
create or replace function public.vision_writer(p_user uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(public.check_user_permission(p_user, 'draft_vision'), false);
$$;

-- يكتب في هذه المسوّدة: جهتُها. ومسوّدةُ الإدارة إن خلت الإدارةُ كلُّها يكتبها الرئيسان، فلا تبقى يتيمةً لا يراها أحد
create or replace function public.vision_can_write(p_user uuid, p_vision bigint)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.vision_writer(p_user) and exists (
    select 1 from public.visions v where v.id = p_vision and (
      case when coalesce(v.author_side, 'qa') = 'qa'
           then public.vision_president_seat(p_user) is null or not public.vision_qa_staffed()
           else public.vision_president_seat(p_user) = v.author_side end));
$$;

-- يرى المسوّدة: جهتُها ما دامت قيد الكتابة، وكلُّ من يُعدّ الرؤى بعد إرسالها
create or replace function public.vision_can_see(p_user uuid, p_vision bigint)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.visions v where v.id = p_vision and (
    case when v.status = 'draft' then public.vision_can_write(p_user, p_vision)
         else public.vision_writer(p_user) or coalesce(public.check_user_permission(p_user, 'manage_vision'), false) end));
$$;

create or replace function public.vision_access(p_user uuid, p_vision bigint)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'president', coalesce(public.check_user_permission(p_user, 'manage_vision'), false),
    'drafter', coalesce(public.check_user_permission(p_user, 'draft_vision'), false),
    'writer', public.vision_writer(p_user),
    'owns', case when p_vision > 0 then public.vision_can_write(p_user, p_vision) else false end,
    'qa_staffed', public.vision_qa_staffed(),
    'seat', public.vision_president_seat(p_user),
    'supervisor', exists (select 1 from public.vision_team where vision_id = p_vision and role = 'supervisor' and profile_id = p_user),
    'leader', exists (select 1 from public.vision_team where vision_id = p_vision and role = 'leader' and profile_id = p_user),
    'tracks', coalesce((select jsonb_agg(track_id order by track_id) from public.vision_team
                        where vision_id = p_vision and role = 'track' and profile_id = p_user), '[]'::jsonb)
  );
$$;

create or replace function public.vision_plan_create(p_actor uuid, p_name text, p_slug text, p_starts date, p_horizon date, p_label text, p_from bigint default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id bigint;
begin
  if not public.vision_writer(p_actor) then
    return jsonb_build_object('ok', false, 'message', 'إنشاءُ الرؤى لإدارة الضمان والجودة والرئيسين.');
  end if;
  if exists (select 1 from public.visions where slug = lower(btrim(p_slug))) then
    return jsonb_build_object('ok', false, 'message', 'هذا المعرّف لرؤيةٍ أخرى، اختر غيره.');
  end if;
  insert into public.visions (slug, name, starts_on, horizon_label, horizon_on, status, created_by, author_side, mark)
  values (lower(btrim(p_slug)), btrim(p_name), p_starts, nullif(btrim(coalesce(p_label, '')), ''), p_horizon, 'draft', p_actor,
          coalesce(public.vision_president_seat(p_actor), 'qa'), '{"kind":"svg","viewBox":"0 0 1 1","layers":[]}'::jsonb)
  returning id into v_id;
  if p_from is not null then
    insert into public.vision_tracks (vision_id, position, name, summary, icon)
    select v_id, position, name, summary, icon from public.vision_tracks where vision_id = p_from order by position;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when check_violation then return jsonb_build_object('ok', false, 'message', 'تحقّق من الاسم والمعرّف والتاريخين: موعدُ النهاية بعد البداية.');
  when unique_violation then return jsonb_build_object('ok', false, 'message', 'هذا المعرّف لرؤيةٍ أخرى، اختر غيره.');
end;
$$;

-- الإرسالُ والسحبُ والحذفُ لجهة المسوّدة، والكتابةُ لها وحدها؛ وإشعارا الاعتماد والإعادة يصلان الإدارةَ حين تكون المسوّدةُ مسوّدتَها،
-- وإلّا فصاحبَها (ومن وافق، في الإعادة) — على سَنن الترحيل السابق: تبديلٌ في نصّ الدالّة الحيّ، ويفشل إن لم يقع
do $m$
declare d text; o text;
begin
  d := pg_get_functiondef('public.vision_plan_act(bigint,uuid,text,text)'::regprocedure); o := d;
  d := replace(d, 'v_writer boolean := public.vision_writer(p_actor);', 'v_writer boolean := public.vision_can_write(p_actor, p_vision);');
  d := replace(d, 'الإرسالُ لإدارة الضمان والجودة.', 'الإرسالُ لصاحب المسوّدة.');
  d := replace(d, 'السحبُ لإدارة الضمان والجودة.', 'السحبُ لصاحب المسوّدة.');
  d := replace(d, 'الحذفُ لإدارة الضمان والجودة.', 'الحذفُ لصاحب المسوّدة.');
  d := replace(d, 'select jsonb_array_elements_text(public.vision_qa_members()) u',
                  'select q u from jsonb_array_elements_text(public.vision_qa_members()) q where coalesce(v.author_side, ''qa'') = ''qa''');
  d := replace(d, 'union select (jsonb_array_elements_text(public.vision_qa_members()))::uuid',
                  'union select q::uuid from jsonb_array_elements_text(public.vision_qa_members()) q where coalesce(v.author_side, ''qa'') = ''qa''');
  if (select count(*) from regexp_matches(d, 'vision_can_write|لصاحب المسوّدة|author_side', 'g')) <> 6 then
    raise exception 'vision_plan_act: لم يقع التبديل كاملًا';
  end if;
  execute d;

  d := pg_get_functiondef('public.vision_plan_save(bigint,uuid,jsonb,integer)'::regprocedure); o := d;
  d := replace(d, 'if not public.vision_writer(p_actor) then', 'if not public.vision_can_write(p_actor, p_vision) then');
  d := replace(d, 'كتابةُ الرؤى لإدارة الضمان والجودة، والرئيسان يراجعانها.', 'هذه المسوّدة لجهتها، ولا يكتب فيها غيرُها.');
  if d = o or position('vision_can_write' in d) = 0 then raise exception 'vision_plan_save: لم يقع التبديل'; end if;
  execute d;
end
$m$;

revoke all on function public.vision_can_write(uuid, bigint) from public, anon, authenticated;
revoke all on function public.vision_can_see(uuid, bigint) from public, anon, authenticated;
grant execute on function public.vision_can_write(uuid, bigint) to service_role;
grant execute on function public.vision_can_see(uuid, bigint) to service_role;
