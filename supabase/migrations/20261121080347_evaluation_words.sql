-- «الدورة» و«الورقة» غيرُ واضحتين (المجلس الإداريّ ٢٠٢٦-١١-٢١): ما يُقرأ صار «تقييم الشهر» و«التقييم».
-- في القاعدة رسالتان تُقرآن فقط (تصحيحُ الأهليّة، ومنفذُ الحكم)؛ تُستبدل كلمتُهما ولا يُمسّ شيءٌ سواها في الدالّتين.
do $$
declare v_def text;
begin
  v_def := pg_get_functiondef('public.evaluation_correct_rater(uuid,integer,uuid,text,text,text)'::regprocedure);
  if position('الدورةُ لم تُفتح بعد.' in v_def) > 0 then
    execute replace(v_def, 'الدورةُ لم تُفتح بعد.', 'التقييمُ لم يُفتح بعد.');
  end if;
  v_def := pg_get_functiondef('public.evaluation_record(integer,jsonb)'::regprocedure);
  if position('الدورةُ ليست مغلقةً تنتظر الحكم.' in v_def) > 0 then
    execute replace(v_def, 'الدورةُ ليست مغلقةً تنتظر الحكم.', 'التقييمُ ليس مغلقًا ينتظر الحكم.');
  end if;
end $$;
