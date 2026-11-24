-- الرؤية: شعارٌ اختياريّ، وموعدا البداية والنهاية بالكلام اختياريّان (يُكتب التاريخ إن غابا)،
-- والعلامة المرفوعة شرطٌ للإرسال (الهلال لرؤية الهلال وحدها). «سطر تحت العدّاد» يتوقّف هنا:
-- لا يُكتب ولا يُعرض في الواجهة الجديدة، ويُحذف عموده بعد الرفع (الموقع المنشور ما زال يقرؤه).

alter table public.visions
  add column if not exists slogan text,
  add column if not exists starts_label text;
alter table public.visions
  add constraint visions_slogan_check check (slogan is null or char_length(btrim(slogan)) between 2 and 80),
  add constraint visions_starts_label_check check (starts_label is null or char_length(btrim(starts_label)) between 2 and 40);
alter table public.visions alter column horizon_label drop not null;
alter table public.visions drop constraint visions_horizon_label_check;
alter table public.visions add constraint visions_horizon_label_check
  check (horizon_label is null or char_length(btrim(horizon_label)) between 2 and 40);
alter table public.visions alter column mark set default '{"kind":"svg","viewBox":"0 0 1 1","layers":[]}'::jsonb;

do $mig$
declare d text; o text;
begin
  -- الإنشاء: موعد النهاية بالكلام اختياريّ، والعلامة تبدأ فارغةً تنتظر الملفّ
  d := pg_get_functiondef('public.vision_plan_create(uuid,text,text,date,date,text,bigint)'::regprocedure); o := d;
  d := replace(d, 'p_starts, btrim(p_label), p_horizon, ''draft'', p_actor, ''{"kind":"hilal"}''::jsonb)',
                  'p_starts, nullif(btrim(coalesce(p_label, '''')), ''''), p_horizon, ''draft'', p_actor, ''{"kind":"svg","viewBox":"0 0 1 1","layers":[]}''::jsonb)');
  if d = o then raise exception 'vision_plan_create: pattern not found'; end if;
  execute d;

  -- الحفظ: الشعار وموعدا البداية والنهاية بالكلام، بلا سطر العدّاد؛ وما ليس ملفًّا مرفوعًا يُبقي العلامة كما هي
  d := pg_get_functiondef('public.vision_plan_save(bigint,uuid,jsonb,integer)'::regprocedure); o := d;
  d := replace(d, E'    horizon_label = btrim(p_plan->>''horizon_label''),\n    horizon_note = nullif(btrim(coalesce(p_plan->>''horizon_note'', '''')), ''''),',
                  E'    horizon_label = nullif(btrim(coalesce(p_plan->>''horizon_label'', '''')), ''''),\n    starts_label = nullif(btrim(coalesce(p_plan->>''starts_label'', '''')), ''''),\n    slogan = nullif(btrim(coalesce(p_plan->>''slogan'', '''')), ''''),');
  if d = o then raise exception 'vision_plan_save: labels pattern not found'; end if;
  o := d;
  d := replace(d, E'else ''{"kind":"hilal"}''::jsonb end,', E'else v.mark end,');
  if d = o then raise exception 'vision_plan_save: mark pattern not found'; end if;
  execute d;

  -- الإرسال: لا يُرسل إلا بعلامةٍ مرفوعة
  d := pg_get_functiondef('public.vision_plan_act(bigint,uuid,text,text)'::regprocedure); o := d;
  d := replace(d, E'    if v.mark->>''kind'' = ''svg'' then\n      if jsonb_array_length',
                  E'    if v.mark->>''kind'' <> ''svg'' or jsonb_array_length(coalesce(v.mark->''layers'', ''[]''::jsonb)) = 0 then\n      return jsonb_build_object(''ok'', false, ''message'', ''ارفع ملفَّ علامة الرؤية قبل الإرسال.'');\n    end if;\n    if v.mark->>''kind'' = ''svg'' then\n      if jsonb_array_length');
  if d = o then raise exception 'vision_plan_act: submit pattern not found'; end if;
  execute d;

  -- الصفحة العامّة: الشعار وموعد البداية بالكلام، وموعدا الأرشيف
  d := pg_get_functiondef('public.get_public_vision(text)'::regprocedure); o := d;
  d := replace(d, E'      ''starts_on'', v.starts_on,\n      ''horizon_label''',
                  E'      ''starts_on'', v.starts_on,\n      ''starts_label'', v.starts_label,\n      ''slogan'', v.slogan,\n      ''horizon_label''');
  if d = o then raise exception 'get_public_vision: head pattern not found'; end if;
  o := d;
  d := replace(d, E'''slug'', o.slug, ''name'', o.name, ''starts_on'', o.starts_on,\n          ''horizon_label'', o.horizon_label,',
                  E'''slug'', o.slug, ''name'', o.name, ''starts_on'', o.starts_on, ''starts_label'', o.starts_label,\n          ''horizon_label'', o.horizon_label, ''horizon_on'', o.horizon_on,');
  if d = o then raise exception 'get_public_vision: archive pattern not found'; end if;
  execute d;
end
$mig$;

update public.visions set slogan = 'هلالٌ يكتمل بكم' where slug = 'hilal' and slogan is null;
