-- ══ نتيجتي تقول أين عاد المستبعَد (محمد ٢٠٢٦-١١-٢٠) ═══════════════════════════════════════
--
-- «استُبعدتِ من المنصب» وحدها تترك سؤالَ صاحبها الأوّل بلا جواب: «وأين أنا الآن؟». و`evaluation_targets.returned_to`
-- محفوظةٌ منذ التنفيذ (`evaluation_03_execution`)، ولم تكن `evaluation_my_results` تُعيدها. فتُعيد اسمَ اللجنة التي عاد إليها
-- (`returned_unit`)، وهل ينتظر لجنةً يعود إليها (`awaiting_return`: المنسّقُ بلا لجنةٍ سابقة يبقى في منصبه حتى تُختار، المسألة ٤).
-- ولا جديدَ في السرّيّة: الحقلان عن صاحب الجلسة نفسِه.
--
-- تغيّر شكلُ الجواب، فتُسقط الدالّةُ وتُعاد (`create or replace` لا يغيّر أعمدةَ الجواب)، ويُعاد منحُها.

drop function if exists public.evaluation_my_results();

create function public.evaluation_my_results()
returns table(target_id integer, due_on date, role_name text, unit_name text, verdict text, branch text,
              final_num bigint, final_den bigint,
              members_num bigint, members_den bigint, members_ballots integer, members_eligible integer,
              council_num bigint, council_den bigint, council_ballots integer,
              comments integer, removed_at timestamptz, restored_at timestamptz, cancelled text,
              returned_unit text, awaiting_return boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select t.id, c.due_on, t.role_name, t.unit_name, t.verdict, t.branch, t.final_num, t.final_den,
         case when t.members_ballots >= 3 then t.members_num end,
         case when t.members_ballots >= 3 then t.members_den end,
         t.members_ballots, t.members_eligible,
         case when t.council_ballots >= 3 then t.council_num end,
         case when t.council_ballots >= 3 then t.council_den end,
         t.council_ballots,
         (select count(*)::integer from evaluation_ballots b
          where b.target_id = t.id and b.voided_at is null and (b.keep_text is not null or b.change_text is not null)),
         t.removed_at, t.restored_at, t.cancelled,
         (select u.committee_name_ar from committees u where u.id = t.returned_to),
         t.awaiting_return
  from evaluation_targets t
  join evaluation_cycles c on c.id = t.cycle_id
  where t.user_id = auth.uid() and t.excluded is null and c.status = 'executed'
  order by c.due_on desc, t.id;
$$;
-- منحٌ مقصود: نتيجةُ صاحب الجلسة وحده (أحكامٌ عامّة: «يتسلّم كلُّ مقيَّمٍ نتيجتَه وحده»).
revoke all on function public.evaluation_my_results() from public, anon;
grant execute on function public.evaluation_my_results() to authenticated;
