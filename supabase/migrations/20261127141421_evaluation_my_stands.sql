-- ══ «نتيجتي»: أين يقف المقيَّمُ في كلّ بند، بجلسته هو (محمد ٢٠٢٦-١١-٢٧) ═════════════════════════
--
-- قال محمد: «التقييمُ غرضُه أن يتطوّر القائد، فلا بدّ من إظهار التقييمات كلِّها». وكانت المعاينةُ تقرأ أوراقَ الدورة
-- بمفتاح الخدمة (`evaluation_admin_ballots`) على جهاز التطوير وحده، فلا شيءَ في الإنتاج. هذه الدالّةُ تعطي صاحبَ
-- النتيجة ما يخصّه: **كلُّ بندٍ ومستواه من خمس**، بلا اسمِ مقيِّمٍ ولا ورقةٍ بعينها.
--
-- 1. **الجلسةُ هي الحقيقة:** المقيَّمُ من `auth.uid()`، ولا يُقبل معاملٌ يسمّيه. والهدفُ المطلوب يجب أن يكون له هو
--    (`t.user_id = auth.uid()`)، وإلّا رجع لا شيء. فلا يسأل أحدٌ عن بنود غيره.
-- 2. **بعد التنفيذ وحده:** كـ`evaluation_my_comments`: لا يرى أحدٌ شيئًا قبل أن يصدر الحكم (`c.status = 'executed'`).
-- 3. **المتوسّطُ على الخادم:** ما يبلغ المتصفّحَ إلّا مستوى البند (1–5) لا متوسّطَه ولا درجاتِ الأوراق.
-- 4. **بندان مشتركان بين الشقّين:** «التفعيل» في استبيان الأعضاء والمجلس معًا، فيُجمع بوزني الشقّين 70/30 (م٨/2)؛
--    وما سواه من بندٍ في شقٍّ واحدٍ يؤخذ من شقّه. وبندٌ لا ورقةَ فيها لا يُعاد.
-- 5. **المفاتيحُ** هي مفاتيحُ `app/dashboard/evaluation/vocab.ts` (`MEMBER_ITEM_LIST` و`COUNCIL_ITEM_LIST`) بترتيبها،
--    ويحرس تطابقَها اختبارُ `evaluationMyStands.test.ts`. فإن تغيّر بندٌ فالتغييرُ في الموضعين.
--
-- في المعاينة (view-as) تعمل كما تعمل `evaluation_my_comments`: المعاينةُ الكاملةُ قرارُ المالك (٢٠٢٦-١١-٢٠)، وما تعيده
-- مجاميعُ بلا أسماء لا ورقةٌ بعينها (على خلاف `evaluation_my_ballot` التي تردّ المعاينة لأنّها تُظهر ما قيّم به المعايِنُ).

create or replace function public.evaluation_my_stands(p_target integer)
returns table(item_key text, level integer)
language sql
stable
security definer
set search_path to 'public'
as $$
  with mine as (
    select t.id
    from evaluation_targets t
    join evaluation_cycles c on c.id = t.cycle_id
    where t.id = p_target
      and t.user_id = auth.uid()
      and t.excluded is null
      and c.status = 'executed'
  ),
  items(part, idx, ord, item_key) as (
    values
      ('members', 1,  1, 'interaction'),
      ('members', 2,  2, 'activation'),
      ('members', 3,  3, 'communication'),
      ('members', 4,  4, 'fairness'),
      ('members', 5,  5, 'followup'),
      ('members', 6,  6, 'conduct'),
      ('members', 7,  7, 'example'),
      ('council', 1,  2, 'activation'),
      ('council', 2,  8, 'quality'),
      ('council', 3,  9, 'responsiveness'),
      ('council', 4, 10, 'team'),
      ('council', 5, 11, 'cooperation')
  ),
  per_part as (
    select i.item_key, i.part, min(i.ord) as ord, avg(b.scores[i.idx])::numeric as a
    from mine m
    join evaluation_ballots b on b.target_id = m.id and b.voided_at is null
    join items i on i.part = b.part
    group by i.item_key, i.part
  ),
  merged as (
    select item_key, min(ord) as ord,
           max(a) filter (where part = 'members') as m,
           max(a) filter (where part = 'council') as c
    from per_part
    group by item_key
  )
  select item_key,
         least(5, greatest(1, round(case when m is not null and c is not null then m * 0.7 + c * 0.3
                                         else coalesce(m, c) end)))::integer
  from merged
  order by ord;
$$;

comment on function public.evaluation_my_stands(integer) is
  'مستوى كلّ بندٍ (1–5) لصاحب الجلسة في تقييمٍ منفَّذ، بلا أسماء ولا أوراق. الهدفُ يجب أن يكون له.';

-- منحٌ مقصود: صفحةُ «نتيجتي» تقرأ بجلسة صاحبها، والدالّةُ تتحقّق من الجلسة بنفسها
revoke all on function public.evaluation_my_stands(integer) from public, anon;
grant execute on function public.evaluation_my_stands(integer) to authenticated;
