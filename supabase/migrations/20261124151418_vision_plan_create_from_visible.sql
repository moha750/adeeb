-- رؤيةٌ جديدة «بمسارات رؤيةٍ سابقة» لا تنسخ إلّا من رؤيةٍ يراها منشئُها (المراجعةُ المستقلّة ٢٠٢٦-١١-٢٤).
-- هذا الترحيلُ وضع الفحصَ بعد إدراج الرؤية خطأً، فصحّحه الذي بعده (`20261124151432`) بإعادة كتابة الدالّة كاملة؛ ويبقى هنا لأنّه في سجلّ القاعدة الحيّة.
do $m$
declare d text; o text;
begin
  d := pg_get_functiondef('public.vision_plan_create(uuid,text,text,date,date,text,bigint)'::regprocedure); o := d;
  d := replace(d, '  if p_from is not null then
    insert into public.vision_tracks',
  '  if p_from is not null and not public.vision_can_see(p_actor, p_from) then
    return jsonb_build_object(''ok'', false, ''message'', ''لا تُنسخ مساراتُ رؤيةٍ لا تراها.'');
  end if;
  if exists (select 1 from public.visions where slug = lower(btrim(p_slug))) then null; end if;
  if p_from is not null then
    insert into public.vision_tracks');
  if d = o then raise exception 'vision_plan_create: لم يقع التبديل'; end if;
  execute d;
end
$m$;
