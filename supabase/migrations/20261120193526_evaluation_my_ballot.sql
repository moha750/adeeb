-- ══ «عرض تقييمي»: ورقةُ المقيِّم لصاحبها وحده (محمد ٢٠٢٦-١١-٢٠) ═════════════════════════════
--
-- طلبه محمد: «عند التقييم وإغلاق النافذة بشكلٍ طبيعي يكون هناك زرٌّ لرؤية التقييم الذي قيّمته».
-- والأوراقُ مغلقةٌ عمدًا (السرّيّة، `evaluation_01_schema`): لا سياسةَ قراءة، وكلُّ قراءةٍ مجاميع. فهذه أوّلُ
-- دالّةٍ تُعيد ورقةً بعينها، وقيودُها ثلاثة:
--
-- 1. **الجلسةُ هي الحقيقة:** المقيِّمُ من `auth.uid()` لا من معامل، فلا يطلب أحدٌ ورقةَ غيره.
-- 2. **لا في المعاينة:** المعاينةُ الكاملة (`lib/view-as-token.ts`) تجعل المعاينَ هو المُعايَنَ في القاعدة، فلولا
--    هذا القيدُ لرأى من يملك المعاينة بماذا قيّم كلُّ عضوٍ قائدَه. الرمزُ يحمل `is_preview`، فتردّه الدالّة.
-- 3. **قراءةٌ وحدها:** الورقةُ لا تُعدَّل بعد إرسالها (`evaluation_submit`: «التقييمُ لا يُعاد»)، والمُبطَلةُ لا تُعرض.
--
-- ولا وقتَ في الجواب ولا اسمَ مقيِّم: ما يعرفه صاحبُ الورقة أصلًا.

create or replace function public.evaluation_my_ballot(p_target integer)
returns table(part text, scores smallint[], keep_text text, change_text text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select b.part, b.scores, b.keep_text, b.change_text
  from evaluation_ballots b
  where b.target_id = p_target
    and b.rater_id = auth.uid()
    and b.voided_at is null
    and coalesce((auth.jwt() ->> 'is_preview')::boolean, false) = false;
$$;

comment on function public.evaluation_my_ballot(integer) is
  'ورقةُ صاحب الجلسة لمقيَّمٍ واحد، للقراءة. لا معاملَ يسمّي المقيِّم، ولا جوابَ في جلسة معاينة.';

-- منحٌ مقصود: صفحةُ «قيّم القيادات» تقرأ ورقةَ صاحب الجلسة وحده (`auth.uid()`)، وتُردّ جلسةُ المعاينة
revoke all on function public.evaluation_my_ballot(integer) from public, anon;
grant execute on function public.evaluation_my_ballot(integer) to authenticated;
