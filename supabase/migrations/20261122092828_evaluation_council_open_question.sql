-- تقييمُ القيادات (٧): السؤالُ المفتوح لشقّ المجلس أيضًا.
--
-- كان السؤالُ المفتوح («ما الذي تريد أن يستمر عليه؟ وما الذي يحتاج إلى تغيير؟») للأعضاء وحدهم (م٦/4)، فلم يجد
-- محمد حقلَي الملاحظات حين قيّم من المجلس. فعدّل المادة السابعة (٢٠٢٦-١١-٢٢): يُختم تقييمُ المجلس بالسؤال نفسه،
-- ولا يدخل الحساب. والإجاباتُ تصل المقيَّمَ كما تصل إجاباتُ الأعضاء: بلا أسماء، مخلوطةً بترتيبٍ عشوائيّ
-- (`evaluation_my_comments`)، فلا يُعرف أنّ الإجابة من المجلس ولا من كتبها.
--
-- والتقييماتُ التي أُرسلت من المجلس قبل هذا تبقى بلا إجابة: التقييمُ لا يُعاد.

alter table public.evaluation_ballots drop constraint evaluation_ballots_open_question;
alter table public.evaluation_ballots add constraint evaluation_ballots_open_question
  check ((keep_text is null or char_length(keep_text) between 1 and 1000)
     and (change_text is null or char_length(change_text) between 1 and 1000));

create or replace function public.evaluation_submit(p_target integer, p_scores integer[],
                                                    p_keep text default null, p_change text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_me    uuid := auth.uid();
  v_part  text;
  v_items integer;
  v_keep  text := nullif(btrim(coalesce(p_keep, '')), '');
  v_change text := nullif(btrim(coalesce(p_change, '')), '');
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'message', 'سجّل الدخول ثمّ أعِد المحاولة.');
  end if;

  select e.part into v_part from evaluation_electorate e
  where e.target_id = p_target and e.rater_id = v_me and e.removed_at is null;
  if v_part is null then
    return jsonb_build_object('ok', false, 'message', 'ليس لك تقييمٌ لهذا المنصب.');
  end if;

  if not public._evaluation_sheet_live(p_target) then
    return jsonb_build_object('ok', false, 'message', 'لم يعد هذا التقييم مفتوحًا.');
  end if;

  v_items := case v_part when 'members' then 7 else 5 end;
  if p_scores is null or array_ndims(p_scores) <> 1 or cardinality(p_scores) <> v_items
     or exists (select 1 from unnest(p_scores) s where s is null or s < 1 or s > 5) then
    return jsonb_build_object('ok', false, 'message', 'قيّم كلَّ البنود من 1 إلى 5.');
  end if;

  -- السؤالُ المفتوح للشقّين (م٦/4 وم٧/3 المعدّلة، ٢٠٢٦-١١-٢٢)
  if char_length(coalesce(v_keep, '')) > 1000 or char_length(coalesce(v_change, '')) > 1000 then
    return jsonb_build_object('ok', false, 'message', 'الإجابةُ أطولُ من ألف حرف.');
  end if;

  insert into evaluation_ballots (target_id, rater_id, part, scores, keep_text, change_text)
  values (p_target, v_me, v_part, p_scores::smallint[], v_keep, v_change)
  on conflict on constraint evaluation_ballots_once do nothing;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'قيّمتَ هذا المنصب من قبل، والتقييمُ لا يُعاد.');
  end if;

  return jsonb_build_object('ok', true, 'message', 'وصل تقييمُك.');
end;
$$;
-- منحٌ مقصود (كما كان): المقيِّمُ يُرسل ورقتَه بجلسته، والمقيِّمُ يُقرأ من `auth.uid()` لا من معامل.
grant execute on function public.evaluation_submit(integer, integer[], text, text) to authenticated;
