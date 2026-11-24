-- «السطر تحت العدّاد» سقط من الواجهة والحفظ (محمد ٢٠٢٦-١١-٢٣)، وبعد دمج #25 (٢٠٢٦-١١-٢٤) لا يقرؤه شيء: يخرج من `get_public_vision`.
-- والعمودُ `visions.horizon_note` باقٍ بلا قارئ: حذفُه يحتاج إذنًا لا تعطيه أداةُ الترحيل.
do $m$
declare d text; o text;
begin
  d := pg_get_functiondef('public.get_public_vision(text)'::regprocedure); o := d;
  d := replace(d, E'      ''horizon_note'', v.horizon_note,\n', '');
  if d = o then raise exception 'get_public_vision: لم يقع التبديل'; end if;
  execute d;
end
$m$;
