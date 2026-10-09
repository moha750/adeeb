-- فئةُ الإنهاء ببلوغ حدّ الإنذارات (تتمّة `termination_kind`، ٢٠٢٦-١٠-٠٩)
--
-- السحبُ الآليّ يمرّ بـ`_apply_termination` بمصدر `warning_threshold`، فكانت فئتُه «أسباب أخرى».
-- وهو في الحقيقة أحدُ اثنين بحسب تصنيف الإنذار الذي بلغ به الحدّ: الغيابُ والتأخّرُ والتقصيرُ
-- وانقطاعُ التواصل «عدم تفاعل»، ومخالفةُ السلوك والدستور «مخالفة». فيضع `issue_warning` الفئةَ
-- قبل النداء كما يفعل بابا السلطة.
--
-- رقعةٌ على جسد الدالّة الحيّ لا نسخةٌ منه: سطرٌ واحد يُدرج قبل نداء الإنهاء، ويُتحقّق أنّه
-- وقع مرّةً واحدةً بالضبط وإلّا سقط الترحيل كلُّه.
do $migration$
declare
  v_def text := pg_get_functiondef('public.issue_warning(uuid, uuid, text, text, integer, date)'::regprocedure);
  v_new text;
  v_anchor constant text := '    perform _apply_termination(';
begin
  if (length(v_def) - length(replace(v_def, v_anchor, ''))) / length(v_anchor) <> 1 then
    raise exception 'issue_warning: موضعُ نداء الإنهاء ليس واحدًا، فلا تُرقَع';
  end if;
  v_new := replace(v_def, v_anchor,
    E'    perform set_config(''app.termination_kind'', case\n'
    || E'      when p_category in (''absence'', ''lateness'', ''task_neglect'', ''unresponsive'') then ''idle''\n'
    || E'      when p_category in (''conduct'', ''policy'') then ''breach''\n'
    || E'      else ''other'' end, true);\n'
    || v_anchor);
  execute v_new;
end
$migration$;
