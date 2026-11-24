-- **من يكتب لا يوافق** (محمد ٢٠٢٦-١١-٢٤): كتابةُ المسوّدة وإرسالُها وسحبُها وحذفُها لإدارة الضمان والجودة وحدها، والرئيسان يراجعان:
-- يوافقان أو يعيدان بملاحظة، ويطلقان ويغلقان، ويعدّلان فريق الرؤية السارية. فلا يوافق أحدٌ على ما كتبه بنفسه.
create or replace function public.vision_writer(p_user uuid)
returns boolean language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select coalesce(public.check_user_permission(p_user, 'draft_vision'), false) and public.vision_president_seat(p_user) is null;
$$;
revoke all on function public.vision_writer(uuid) from public, anon, authenticated;
grant execute on function public.vision_writer(uuid) to service_role;

do $mig$
declare d text; o text;
begin
  d := pg_get_functiondef('public.vision_plan_create(uuid,text,text,date,date,text,bigint)'::regprocedure); o := d;
  d := replace(d, E'  if not coalesce(public.check_user_permission(p_actor, ''draft_vision''), false) then\n    return jsonb_build_object(''ok'', false, ''message'', ''إعداد الرؤى لإدارة الضمان والجودة والرئيسين.'');',
                  E'  if not public.vision_writer(p_actor) then\n    return jsonb_build_object(''ok'', false, ''message'', ''كتابةُ الرؤى لإدارة الضمان والجودة، والرئيسان يراجعانها.'');');
  if d = o then raise exception 'create anchor'; end if;
  execute d;

  d := pg_get_functiondef('public.vision_plan_save(bigint,uuid,jsonb,integer)'::regprocedure); o := d;
  d := replace(d, E'  if not coalesce(public.check_user_permission(p_actor, ''draft_vision''), false) then\n    return jsonb_build_object(''ok'', false, ''message'', ''إعداد الرؤى لإدارة الضمان والجودة والرئيسين.'');',
                  E'  if not public.vision_writer(p_actor) then\n    return jsonb_build_object(''ok'', false, ''message'', ''كتابةُ الرؤى لإدارة الضمان والجودة، والرئيسان يراجعانها.'');');
  if d = o then raise exception 'save anchor'; end if;
  execute d;

  d := pg_get_functiondef('public.vision_plan_act(bigint,uuid,text,text)'::regprocedure); o := d;
  d := replace(d, E'  v_drafter boolean := coalesce(public.check_user_permission(p_actor, ''draft_vision''), false);',
                  E'  v_drafter boolean := coalesce(public.check_user_permission(p_actor, ''draft_vision''), false);\n  v_writer boolean := public.vision_writer(p_actor);');
  if d = o then raise exception 'decl anchor'; end if; o := d;
  d := replace(d, E'if not v_drafter then return jsonb_build_object(''ok'', false, ''message'', ''الإرسال لمن يُعدّ الرؤى.''); end if;',
                  E'if not v_writer then return jsonb_build_object(''ok'', false, ''message'', ''الإرسالُ لإدارة الضمان والجودة.''); end if;');
  if d = o then raise exception 'submit anchor'; end if; o := d;
  d := replace(d, E'if not v_drafter then return jsonb_build_object(''ok'', false, ''message'', ''السحب لمن يُعدّ الرؤى.''); end if;',
                  E'if not v_writer then return jsonb_build_object(''ok'', false, ''message'', ''السحبُ لإدارة الضمان والجودة.''); end if;');
  if d = o then raise exception 'recall anchor'; end if; o := d;
  d := replace(d, E'if not v_drafter then return jsonb_build_object(''ok'', false, ''message'', ''الحذفُ لمن يُعدّ الرؤى.''); end if;',
                  E'if not v_writer then return jsonb_build_object(''ok'', false, ''message'', ''الحذفُ لإدارة الضمان والجودة.''); end if;');
  if d = o then raise exception 'discard anchor'; end if; o := d;
  -- الموافقةُ الأولى تُشعر الرئيسَ الآخر أنّها بانتظاره
  d := replace(d, E'''notify'', case when v_n >= 2 and v.submitted_by is not null and v.submitted_by <> p_actor then jsonb_build_array(v.submitted_by) else ''[]''::jsonb end);',
                  E'''notify'', case when v_n >= 2 and v.submitted_by is not null and v.submitted_by <> p_actor then jsonb_build_array(v.submitted_by) else ''[]''::jsonb end,\n      ''other'', case when v_n = 1 then coalesce((select jsonb_agg(u) from jsonb_array_elements_text(v_presidents) u\n                                                 where public.vision_president_seat(u::uuid) is distinct from v_seat), ''[]''::jsonb) else ''[]''::jsonb end,\n      ''seat'', v_seat);');
  if d = o then raise exception 'approve anchor'; end if;
  execute d;

  d := pg_get_functiondef('public.vision_access(uuid,bigint)'::regprocedure); o := d;
  d := replace(d, E'''drafter'', coalesce(public.check_user_permission(p_user, ''draft_vision''), false),',
                  E'''drafter'', coalesce(public.check_user_permission(p_user, ''draft_vision''), false),\n    ''writer'', public.vision_writer(p_user),');
  if d = o then raise exception 'access anchor'; end if;
  execute d;
end
$mig$;
