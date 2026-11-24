-- الفحصُ قبل إنشاء الرؤية لا بعده (الترحيلُ السابق وضعه بعد الإدراج، فكان الرفضُ يُبقي مسوّدةً فارغة)
create or replace function public.vision_plan_create(p_actor uuid, p_name text, p_slug text, p_starts date, p_horizon date, p_label text, p_from bigint default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id bigint;
begin
  if not public.vision_writer(p_actor) then
    return jsonb_build_object('ok', false, 'message', 'إنشاءُ الرؤى لإدارة الضمان والجودة والرئيسين.');
  end if;
  -- لا تُنسخ إلّا مساراتُ رؤيةٍ يراها منشئُها: مسوّدةُ غيره قبل إرسالها كأنّها لم تكن
  if p_from is not null and not public.vision_can_see(p_actor, p_from) then
    return jsonb_build_object('ok', false, 'message', 'لا تُنسخ مساراتُ رؤيةٍ لا تراها.');
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
