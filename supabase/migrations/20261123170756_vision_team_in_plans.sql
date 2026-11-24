-- فريقُ الرؤية جزءٌ مما يُعتمد (محمد ٢٠٢٦-١١-٢٣): يُسمّى في المسوّدة فيوافق عليه الرئيسان معها، ويُعدَّل بعد الإطلاق من «الرؤى».
-- والإدارةُ كلُّها في «الرؤى» لمن يُعدّها (`draft_vision`: الضمانُ والجودة والرئيسان)، و«متابعة الرؤية» مساحةُ عمل الفريق وحدها:
-- تسميةُ الفريق والإغلاقُ يخرجان منها.

do $mig$
declare d text; o text;
begin
  -- الحفظ: المقاعدُ مع المسوّدة، ومقعدُ قائد المسار بترتيب مساره (المساراتُ تُكتب من جديد في كلّ حفظ)
  d := pg_get_functiondef('public.vision_plan_save(bigint,uuid,jsonb,integer)'::regprocedure); o := d;
  d := replace(d, E'\n  if exists (select 1 from public.vision_log where vision_id = p_vision) then\n    insert into public.vision_log (vision_id, actor, action, details)\n    values (p_vision, p_actor, ''saved''',
                  E'\n  if p_plan ? ''team'' then\n    delete from public.vision_team where vision_id = p_vision;\n    insert into public.vision_team (vision_id, role, track_id, profile_id, name, gender, updated_by)\n    select p_vision, s->>''role'',\n           case when s->>''role'' = ''track'' then (select id from public.vision_tracks where vision_id = p_vision and position = (s->>''track'')::int) end,\n           nullif(s->>''profile_id'', '''')::uuid, nullif(btrim(coalesce(s->>''name'', '''')), ''''), nullif(s->>''gender'', ''''), p_actor\n      from jsonb_array_elements(coalesce(p_plan->''team'', ''[]''::jsonb)) s\n     where s->>''role'' <> ''track'' or exists (select 1 from public.vision_tracks where vision_id = p_vision and position = (s->>''track'')::int);\n  end if;\n\n  if exists (select 1 from public.vision_log where vision_id = p_vision) then\n    insert into public.vision_log (vision_id, actor, action, details)\n    values (p_vision, p_actor, ''saved''');
  if d = o then raise exception 'vision_plan_save: team anchor not found'; end if;
  execute d;

  d := pg_get_functiondef('public.vision_plan_act(bigint,uuid,text,text)'::regprocedure); o := d;
  -- الإرسال: الفريقُ كاملًا (المشرفُ العامّ وقائدُ الرؤية وقائدٌ لكلّ مسار)، فيُعتمد مع الرؤية
  d := replace(d, E'    update public.visions set status = ''review'', submitted_by',
                  E'    if not exists (select 1 from public.vision_team where vision_id = p_vision and role = ''supervisor'')\n       or not exists (select 1 from public.vision_team where vision_id = p_vision and role = ''leader'')\n       or exists (select 1 from public.vision_tracks t where t.vision_id = p_vision\n                   and not exists (select 1 from public.vision_team m where m.track_id = t.id)) then\n      return jsonb_build_object(''ok'', false, ''message'', ''سمِّ فريق الرؤية كاملًا قبل الإرسال: المشرف العام وقائد الرؤية وقائدًا لكلّ مسار.'');\n    end if;\n    update public.visions set status = ''review'', submitted_by');
  if d = o then raise exception 'vision_plan_act: submit anchor not found'; end if;
  o := d;
  -- الإطلاق: يُشعَر كلُّ من في الفريق بمقعده
  d := replace(d, E'''launched'', ''review'', ''active'');\n    return jsonb_build_object(''ok'', true, ''slug'', v.slug, ''name'', v.name);',
                  E'''launched'', ''review'', ''active'');\n    return jsonb_build_object(''ok'', true, ''slug'', v.slug, ''name'', v.name, ''team'', coalesce((\n      select jsonb_agg(jsonb_build_object(''profile_id'', m.profile_id, ''role'', m.role, ''track_name'', t.name))\n        from public.vision_team m left join public.vision_tracks t on t.id = m.track_id\n       where m.vision_id = p_vision and m.profile_id is not null), ''[]''::jsonb));');
  if d = o then raise exception 'vision_plan_act: launch anchor not found'; end if;
  o := d;
  -- الإغلاق: قرارٌ كالإطلاق، لإدارة الضمان والجودة والرئيسين
  d := replace(d, E'    if not (v_manager or exists (select 1 from public.vision_team where vision_id = p_vision and role in (''supervisor'', ''leader'') and profile_id = p_actor)) then\n      return jsonb_build_object(''ok'', false, ''message'', ''الإغلاقُ للمشرف العام وقائد الرؤية والرئيسين.'');',
                  E'    if not (v_drafter or v_seat is not null) then\n      return jsonb_build_object(''ok'', false, ''message'', ''الإغلاقُ لإدارة الضمان والجودة والرئيسين.'');');
  if d = o then raise exception 'vision_plan_act: close anchor not found'; end if;
  execute d;

  -- تعديلُ فريق الرؤية السارية من «الرؤى»: لمن يُعدّها
  d := pg_get_functiondef('public.save_vision_team(bigint,uuid,jsonb)'::regprocedure); o := d;
  d := replace(d, E'  if not coalesce(public.check_user_permission(p_actor, ''manage_vision''), false) then\n    return jsonb_build_object(''ok'', false, ''message'', ''تسمية فريق الرؤية للرئيسين.'');',
                  E'  if not coalesce(public.check_user_permission(p_actor, ''draft_vision''), false) then\n    return jsonb_build_object(''ok'', false, ''message'', ''تسمية فريق الرؤية لإدارة الضمان والجودة والرئيسين.'');');
  if d = o then raise exception 'save_vision_team: gate anchor not found'; end if;
  execute d;
end
$mig$;
