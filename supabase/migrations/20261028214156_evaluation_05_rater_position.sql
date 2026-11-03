-- تقييمُ القيادات الربعيّ (٥): منصبُ المقيِّم تحت اسمه.
--
-- في نافذة التفصيل يُرى المقيِّمون أسماءً، فيُسأل: لماذا هذا هنا؟ ففي «أعضاء اللجنة» نائبُ القائد ومنسّقُ القسم
-- (م٣/3 تحسبهم من الأعضاء)، وفي «المجلس الإداري» والمشرفين مناصبُ لا تُعرف من الاسم. فيعود مع كلّ مقيِّمٍ منصبُه
-- الحاضرُ بالدالّة التي يُكتب بها المسمّى في المنصّة كلِّها (`position_title_of`)، وجنسُه ليُؤنَّث في الواجهة
-- (`rankFor`). ولا يمسّ السرّيّة: المنصبُ يقول من يحقّ له التقييم، لا من قيّم ولا بماذا. (أقرّه محمد ٢٠٢٦-١٠-٢٩.)
--
-- تغييرُ شكل العائد يستلزم إسقاطَ الدالّة وإعادتَها. وهي للخدمة وحدها كما كانت: لا منح.

drop function if exists public.evaluation_admin_electorate(integer);

create function public.evaluation_admin_electorate(p_target integer)
returns table(rater_id uuid, full_name text, part text, added_by_correction boolean, removed boolean,
              supervisor boolean, seat_title text, gender text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select e.rater_id, p.full_name, e.part, e.added_by_correction, e.removed_at is not null,
         e.part = 'council'
           and t.committee_id is not null
           and exists (select 1 from committee_supervision cs
                       where cs.supervisor_id = e.rater_id and cs.committee_id = t.committee_id)
           and not exists (select 1 from user_roles ur
                           where ur.user_id = e.rater_id and ur.is_active
                             and ur.role_name in ('club_president', 'executive_council_president',
                                                  'hr_committee_leader', 'qa_committee_leader')),
         case when e.rater_id is not null then public.position_title_of(e.rater_id) end,
         p.gender
  from evaluation_electorate e
  join evaluation_targets t on t.id = e.target_id
  left join profiles p on p.id = e.rater_id
  where e.target_id = p_target
  order by e.part desc, p.full_name;
$$;
revoke all on function public.evaluation_admin_electorate(integer) from public, anon, authenticated;
